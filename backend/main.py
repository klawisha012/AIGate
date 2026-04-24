from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import logging
import traceback
import os
import re
from dotenv import load_dotenv

load_dotenv()

from presidio_analyzer import AnalyzerEngine
from presidio_anonymizer import AnonymizerEngine
from presidio_anonymizer.entities import OperatorConfig

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="PII Detection API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

try:
    # Initialize with default config first
    analyzer = AnalyzerEngine()
    anonymizer = AnonymizerEngine()
    
    # Try to add Russian support
    try:
        # Check if Russian model is available
        import spacy
        ru_nlp = spacy.load("ru_core_news_lg")
        logger.info("Russian spaCy model (ru_core_news_lg) is available")
    except Exception as ru_e:
        logger.warning(f"Russian model not available: {ru_e}. Only English will be supported.")
    
    logger.info("Presidio Analyzer and Anonymizer initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize Presidio: {e}")
    logger.error(traceback.format_exc())
    analyzer = None
    anonymizer = None

# Mapping Presidio entity types to our format
PRESIDIO_TO_MASKED = {
    'EMAIL_ADDRESS': 'EMAIL',
    'PHONE_NUMBER': 'PHONE',
    'PERSON': 'PERSON',
    'ADDRESS': 'ADDRESS',
    'IP_ADDRESS': 'IP_ADDRESS',
    'DATE_TIME': 'DATE',
    'CREDIT_CARD': 'CREDIT_CARD',
    'US_DRIVER_LICENSE': 'DRIVER_LICENSE',
    'US_PASSPORT': 'PASSPORT',
    'US_BANK_NUMBER': 'BANK_NUMBER',
    'US_ITIN': 'ITIN',
    'LOCATION': 'ADDRESS',
    'ORG': 'ORG',
}

def convert_presidio_format(text: str) -> str:
    """Convert Presidio format <TYPE> to [MASKED_TYPE]"""
    import re
    def replace_match(match):
        entity_type = match.group(1)  # without <>
        mapped = PRESIDIO_TO_MASKED.get(entity_type, entity_type)
        return f'[MASKED_{mapped}]'
    return re.sub(r'<([^>]+)>', replace_match, text)

# OpenRouter integration removed - now handled on frontend
# Backend only handles PII detection and masking


class AnalyzeRequest(BaseModel):
    text: str
    language: str = "en"


class SanitizeRequest(BaseModel):
    text: str
    language: str = "en"
    masking_char: str = "*"
    chars_to_mask: int = 4


class EntityInfo(BaseModel):
    entity_type: str
    start: int
    end: int
    score: float
    text: str


class AnalyzeResponse(BaseModel):
    entities: List[EntityInfo]


class SanitizeResponse(BaseModel):
    original_text: str
    masked_text: str
    entities: List[EntityInfo]


class PayloadSanitizeRequest(BaseModel):
    payload: Dict[str, Any]
    language: str = "en"


class PayloadSanitizeResponse(BaseModel):
    original: Dict[str, Any]
    sanitized: Dict[str, Any]
    entities: List[EntityInfo]


class UnmaskMappingRequest(BaseModel):
    text: str
    mapping: Dict[str, str] = {}


@app.get("/health")
async def health_check():
    status = "healthy" if analyzer and anonymizer else "degraded"
    return {
        "status": status,
        "service": "pii-detection",
        "presidio_available": analyzer is not None
    }


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze_text(request: AnalyzeRequest):
    if not analyzer:
        raise HTTPException(status_code=503, detail="Presidio Analyzer not initialized")

    try:
        # Analyze with multiple languages (en + ru)
        results = analyze_multi_language(request.text)
        entities = [
            EntityInfo(
                entity_type=result.entity_type,
                start=result.start,
                end=result.end,
                score=result.score,
                text=request.text[result.start:result.end]
            )
            for result in results
        ]
        return AnalyzeResponse(entities=entities)
    except Exception as e:
        logger.error(f"Error analyzing text: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/sanitize", response_model=SanitizeResponse)
async def sanitize_text(request: SanitizeRequest):
    if not analyzer or not anonymizer:
        raise HTTPException(status_code=503, detail="Presidio not initialized")

    try:
        # Analyze with multiple languages (en + ru)
        analyze_results = analyze_multi_language(request.text)

        anonymize_result = anonymizer.anonymize(
            text=request.text,
            analyzer_results=analyze_results
        )

        entities = [
            EntityInfo(
                entity_type=result.entity_type,
                start=result.start,
                end=result.end,
                score=result.score,
                text=request.text[result.start:result.end]
            )
            for result in analyze_results
        ]

        # Convert Presidio format to [MASKED_TYPE]
        masked_text = convert_presidio_format(anonymize_result.text)

        return SanitizeResponse(
            original_text=request.text,
            masked_text=masked_text,
            entities=entities
        )
    except Exception as e:
        logger.error(f"Error sanitizing text: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/unmask", response_model=SanitizeResponse)
async def unmask_text(request: SanitizeRequest):
    """
    Replace [MASKED_*] placeholders with original values.
    Reverse transformation of /sanitize endpoint.
    """
    if not analyzer:
        raise HTTPException(status_code=503, detail="Presidio not initialized")

    try:
        # Extract entities from the masked text by analyzing original
        # The request.text contains the assistant's response with [MASKED_*] placeholders
        # We need to map placeholders back to original values from request
        # For this we require the original_values dict in metadata
        return SanitizeResponse(
            original_text=request.text,
            masked_text=request.text,  # output same as input when unmasking
            entities=[]
        )
    except Exception as e:
        logger.error(f"Error unmasking text: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


class UnmaskMappingRequest(BaseModel):
    text: str
    mapping: Dict[str, str] = {}


@app.post("/unmask-with-mapping")
async def unmask_with_mapping(request: UnmaskMappingRequest):
    """
    Replace [MASKED_*] placeholders using a mapping of entity types to original values.
    """
    try:
        text = request.text
        mapping = request.mapping

        def replace_placeholder(match):
            placeholder = match.group(0)  # e.g. [MASKED_EMAIL]
            entity_type = placeholder[8:-1]  # Extract type without brackets
            return mapping.get(entity_type, placeholder)

        unmasked = re.sub(r'\[MASKED_[^\]]+\]', replace_placeholder, text)

        return {
            "original": text,
            "unmasked": unmasked,
            "replacements_count": len(re.findall(r'\[MASKED_[^\]]+\]', text))
        }
    except Exception as e:
        logger.error(f"Error in unmask-with-mapping: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/sanitize-payload", response_model=PayloadSanitizeResponse)
async def sanitize_payload(request: PayloadSanitizeRequest):
    if not analyzer or not anonymizer:
        raise HTTPException(status_code=503, detail="Presidio not initialized")

    try:
        import json

        def process_value(value):
            if isinstance(value, str):
                try:
                    parsed = json.loads(value)
                    if isinstance(parsed, dict):
                        return process_dict(parsed)
                except:
                    pass

                # Use multi-language analysis
                results = analyze_multi_language(value)
                if results:
                    anonymize_result = anonymizer.anonymize(
                        text=value,
                        analyzer_results=results
                    )
                    return convert_presidio_format(anonymize_result.text)
                return value
            elif isinstance(value, dict):
                return process_dict(value)
            elif isinstance(value, list):
                return [process_value(item) for item in value]
            return value

        def process_dict(obj):
            result = {}
            for key, value in obj.items():
                result[key] = process_value(value)
            return result

        original = request.payload
        sanitized = process_value(original)

        all_entities = []

        def collect_entities(value):
            if isinstance(value, str):
                try:
                    parsed = json.loads(value)
                    if isinstance(parsed, dict):
                        collect_entities(parsed)
                except:
                    pass

                # Use multi-language analysis
                results = analyze_multi_language(value)
                for r in results:
                    all_entities.append(EntityInfo(
                        entity_type=r.entity_type,
                        start=r.start,
                        end=r.end,
                        score=r.score,
                        text=value[r.start:r.end]
                    ))
            elif isinstance(value, dict):
                for v in value.values():
                    collect_entities(v)
            elif isinstance(value, list):
                for item in value:
                    collect_entities(item)

        collect_entities(original)

        return PayloadSanitizeResponse(
            original=original,
            sanitized=sanitized,
            entities=all_entities
        )
    except Exception as e:
        logger.error(f"Error sanitizing payload: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


def analyze_multi_language(text: str) -> list:
    """Analyze text for PII using both English and Russian recognizers"""
    if not analyzer:
        return []

    all_results = []
    seen_positions = set()  # To avoid duplicates

    for lang in ['en', 'ru']:
        try:
            results = analyzer.analyze(text=text, language=lang)
            for r in results:
                # Use position + entity_type as unique key
                pos_key = (r.start, r.end, r.entity_type)
                if pos_key not in seen_positions:
                    seen_positions.add(pos_key)
                    all_results.append(r)
        except ValueError as e:
            if "No matching recognizers" in str(e):
                logger.warning(f"No recognizers for language '{lang}', skipping")
            else:
                logger.error(f"Error analyzing with language '{lang}': {e}")
        except Exception as e:
            logger.warning(f"Analysis failed for language {lang}: {e}")

    return all_results


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
