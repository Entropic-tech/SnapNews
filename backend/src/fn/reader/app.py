"""
# --*-- coding: utf-8 --*--
# This module is used to read RSS feeds
"""

# ==================================================================================================
# Python imports
import os

# ==================================================================================================
# AWS imports
from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.utilities.data_classes import EventBridgeEvent, event_source
from aws_lambda_powertools.utilities.typing import LambdaContext

# ==================================================================================================
# Module imports
from lib.aws_utils import get_news_urls, upload_feed_to_s3
from lib.feed_handler import get_feed_from_rss

# ==================================================================================================
# Global declarations
tracer = Tracer()
logger = Logger()

BUCKET_NAME = os.environ["NEWS_FEED_BUCKET"]


@event_source(data_class=EventBridgeEvent)
def main(event: EventBridgeEvent, context: LambdaContext) -> dict:
    """
    This function is used to read RSS feeds
    """
    logger.info(f"Event: {event.raw_event}")
    logger.info(f"Context: {context}")

    news_source: str = event.get("NewsSource")
    news_urls: str = get_news_urls(news_source)

    if not news_urls or not isinstance(news_urls, dict):
        logger.error(f"Invalid news URLs structure received for {news_source}: {news_urls}")
        return {"statusCode": 400, "body": "Invalid news URL data"}

    for category, feed_url in news_urls.items():
        logger.info(f"Processing category: {category}, URL: {feed_url}")
        try:
            feed = get_feed_from_rss(news_source, feed_url)

            if feed:  # Check if feed retrieval was successful
                # Upload the json feed to S3
                s3_key = f"{news_source}-{category}.json"  # Define S3 key using source and category
                logger.info(f"Uploading feed to S3 with key: {s3_key}")
                upload_feed_to_s3(feed, s3_key, BUCKET_NAME)
                logger.info(f"Uploaded feed for {category} to S3 successfully")
            else:
                logger.warning(f"No feed data received for category: {category}, URL: {feed_url}")

        except Exception as e:
            logger.error(f"Error processing category {category} ({feed_url}): {e}")
            raise e

    return {"statusCode": 200, "body": "Success"}
