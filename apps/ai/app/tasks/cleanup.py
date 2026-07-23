import logging
from typing import List

logger = logging.getLogger(__name__)

async def cleanup_deleted_resources(
    pinecone_service=None,
) -> None:
    """
    Daily cleanup: remove Pinecone vectors for resources
    deleted from the DB. Runs via APScheduler.

    Errors are logged but NEVER re-raised so APScheduler
    continues scheduling future runs.
    """
    try:
        deleted_ids: List[str] = await get_orphaned_vector_ids()

        if not deleted_ids:
            logger.debug("[Cleanup] No orphaned vectors found")
            return

        logger.info(f"[Cleanup] Found {len(deleted_ids)} orphaned vectors")

        batch_size = 100
        total_deleted = 0

        for i in range(0, len(deleted_ids), batch_size):
            batch = deleted_ids[i : i + batch_size]
            try:
                if pinecone_service:
                    await pinecone_service.delete_many(batch)
                total_deleted += len(batch)
            except Exception as batch_err:
                logger.error(
                    f"[Cleanup] Failed to delete batch "
                    f"{i//batch_size + 1}: {batch_err}"
                )

        logger.info(f"[Cleanup] Deleted {total_deleted}/{len(deleted_ids)} vectors")

    except Exception as e:
        logger.error(
            f"[Cleanup] Vector cleanup job failed: {e}",
            exc_info=True,
        )

async def get_orphaned_vector_ids() -> List[str]:
    """Find vector IDs for deleted resources."""
    return []
