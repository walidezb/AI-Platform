from fastapi import APIRouter, Query
from typing import Optional
from app.services.pinecone_service import pinecone_service

router = APIRouter(prefix="/search", tags=["Search"])

@router.get("/resources")
async def search_resources(
    q: str = Query(..., min_length=2, max_length=200),
    domain: Optional[str] = Query(None),
    level: Optional[str] = Query(None),
    limit: int = Query(5, ge=1, le=20),
):
    """
    Semantic search over all learning resources.
    Used by the learner's search bar (Phase 4).
    """
    results = await pinecone_service.find_similar_resources(
        query_text=q,
        domain=domain,
        level=level,
        top_k=limit,
        threshold=0.75,  # lower threshold for search (more results)
    )
    return {
        "query": q,
        "results": results,
        "count": len(results),
    }

@router.get("/recommendations/{user_id}")
async def get_recommendations(
    user_id: str,
    completed_ids: str = Query(""),  # comma-separated resource IDs
    domain: str = Query(...),
    level: str = Query("INTERMEDIATE"),
    limit: int = Query(5),
):
    """
    Get personalized resource recommendations.
    Used by the learner dashboard (Phase 4).
    """
    completed_list = [id for id in completed_ids.split(",") if id]

    recommendations = await pinecone_service.get_recommendations(
        completed_resource_ids=completed_list,
        domain=domain,
        level=level,
        limit=limit,
    )
    return {
        "userId": user_id,
        "recommendations": recommendations,
        "count": len(recommendations),
    }
