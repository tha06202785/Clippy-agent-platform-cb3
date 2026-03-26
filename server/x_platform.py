"""
X (Twitter) Platform Integration for Clippy
Auto-post and auto-reply on X platform
"""

import tweepy
from typing import Dict, List, Optional, Tuple
from datetime import datetime
import os

class XPlatformIntegration:
    """
    Integrate Clippy with X (formerly Twitter) platform
    - Auto-post tweets
    - Auto-reply to mentions/DMs
    - Track engagement
    - Capture leads from bio/links
    """
    
    def __init__(self):
        self.api_key = os.getenv('X_API_KEY')
        self.api_secret = os.getenv('X_API_SECRET')
        self.access_token = os.getenv('X_ACCESS_TOKEN')
        self.access_secret = os.getenv('X_ACCESS_SECRET')
        self.bearer_token = os.getenv('X_BEARER_TOKEN')
        
        self.client = None
        self.api = None
        self._authenticate()
    
    def _authenticate(self) -> bool:
        """Authenticate with X API"""
        try:
            # v2 Client for posting
            if self.bearer_token:
                self.client = tweepy.Client(
                    bearer_token=self.bearer_token,
                    consumer_key=self.api_key,
                    consumer_secret=self.api_secret,
                    access_token=self.access_token,
                    access_token_secret=self.access_secret
                )
            
            # v1.1 API for media uploads
            if all([self.api_key, self.api_secret, self.access_token, self.access_secret]):
                auth = tweepy.OAuth1UserHandler(
                    self.api_key, self.api_secret,
                    self.access_token, self.access_secret
                )
                self.api = tweepy.API(auth)
            
            return True
        except Exception as e:
            print(f"X authentication failed: {e}")
            return False
    
    def verify_connection(self) -> Tuple[bool, str]:
        """Verify X API connection"""
        if not self.client:
            return False, "Not authenticated"
        
        try:
            user = self.client.get_me()
            if user.data:
                return True, f"Connected as @{user.data.username}"
            else:
                return False, "Could not get user info"
        except Exception as e:
            return False, str(e)
    
    def create_post(self, content: str, options: Optional[Dict] = None) -> Dict:
        """
        Create a tweet/post on X
        
        Content types:
        - Regular tweet (280 chars)
        - Thread (multiple tweets)
        - With media (images)
        - With links
        - Scheduled (via API)
        """
        try:
            # Check if content needs to be a thread
            if len(content) > 280:
                return self._create_thread(content, options)
            
            # Single tweet
            tweet = self.client.create_tweet(text=content)
            
            return {
                'success': True,
                'id': tweet.data['id'],
                'url': f"https://x.com/user/status/{tweet.data['id']}",
                'content': content,
                'platform': 'x',
                'created_at': datetime.now().isoformat()
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'content': content
            }
    
    def _create_thread(self, content: str, options: Optional[Dict] = None) -> Dict:
        """Create a thread (multiple connected tweets)"""
        try:
            # Split content into 280-char chunks
            tweets = self._split_into_tweets(content)
            
            previous_tweet_id = None
            tweet_ids = []
            
            for i, tweet_text in enumerate(tweets):
                if previous_tweet_id:
                    # Reply to previous tweet
                    tweet = self.client.create_tweet(
                        text=tweet_text,
                        in_reply_to_tweet_id=previous_tweet_id
                    )
                else:
                    # First tweet
                    tweet = self.client.create_tweet(text=tweet_text)
                
                previous_tweet_id = tweet.data['id']
                tweet_ids.append(tweet.data['id'])
            
            return {
                'success': True,
                'ids': tweet_ids,
                'url': f"https://x.com/user/status/{tweet_ids[0]}",
                'content': content,
                'platform': 'x',
                'thread': True,
                'tweet_count': len(tweets),
                'created_at': datetime.now().isoformat()
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'content': content
            }
    
    def _split_into_tweets(self, content: str, max_length: int = 270) -> List[str]:
        """Split long content into tweet-sized chunks"""
        if len(content) <= max_length:
            return [content]
        
        tweets = []
        current_tweet = ""
        
        # Split by sentences first
        sentences = content.replace('. ', '.|').replace('! ', '!|').replace('? ', '?|').split('|')
        
        for sentence in sentences:
            if len(current_tweet) + len(sentence) + 1 <= max_length:
                current_tweet += sentence + " "
            else:
                if current_tweet:
                    tweets.append(current_tweet.strip())
                current_tweet = sentence + " "
        
        if current_tweet:
            tweets.append(current_tweet.strip())
        
        # If still too long, split by words
        if any(len(t) > max_length for t in tweets):
            words = content.split()
            tweets = []
            current_tweet = ""
            
            for word in words:
                if len(current_tweet) + len(word) + 1 <= max_length:
                    current_tweet += word + " "
                else:
                    tweets.append(current_tweet.strip())
                    current_tweet = word + " "
            
            if current_tweet:
                tweets.append(current_tweet.strip())
        
        # Add thread indicators
        for i in range(len(tweets)):
            if len(tweets) > 1:
                tweets[i] = f"{i+1}/{len(tweets)} {tweets[i]}"
        
        return tweets
    
    def create_listing_post(self, property_data: Dict) -> Dict:
        """Create X post optimized for real estate listings"""
        
        # Format for X (concise, hashtags)
        beds = property_data.get('beds', 3)
        baths = property_data.get('baths', 2)
        price = property_data.get('price', '')
        address = property_data.get('address', 'This property')
        suburb = property_data.get('suburb', '')
        
        # X-optimized format
        content = f"""🏠 NEW LISTING: {suburb}

{beds} bed | {baths} bath | {price}

{address}

📞 DM for inspection
🔗 Bio for details

#RealEstate #{suburb.replace(' ', '')} #Property #ForSale #RealEstateAgent"""
        
        return self.create_post(content)
    
    def create_engagement_post(self, content_type: str = 'poll') -> Dict:
        """Create engagement-optimized posts"""
        
        templates = {
            'poll': """📊 POLL: What's your biggest challenge as a real estate agent?

A) Finding leads
B) Writing listings  
C) Following up
D) Time management

Comment your answer 👇

#RealEstate #AgentLife #Poll""",
            
            'tips': """💡 TIP: Write listing descriptions that SELL the lifestyle, not just the features.

❌ "3 bed, 2 bath, pool"
✅ "Summer evenings by the pool with family"

Which would you click?

#RealEstateTips #Copywriting""",
            
            'testimonial': """⭐ "Best investment I've made for my real estate business" - Sarah, Agent

Clippy AI helped her save 10+ hours/week.

Want to see how? Check bio 🔗

#Testimonial #RealEstate #AI""",
            
            'before_after': """BEFORE: 2 hours writing one listing

AFTER: 30 seconds with AI

That's 10 hours/week back in your life.

#RealEstate #Efficiency #AITools"""
        }
        
        content = templates.get(content_type, templates['tips'])
        return self.create_post(content)
    
    def reply_to_mention(self, tweet_id: str, username: str, message: str) -> Dict:
        """Auto-reply to mentions"""
        try:
            reply_text = f"@{username} {message}"
            
            # Keep under 280 chars
            if len(reply_text) > 280:
                reply_text = reply_text[:277] + "..."
            
            tweet = self.client.create_tweet(
                text=reply_text,
                in_reply_to_tweet_id=tweet_id
            )
            
            return {
                'success': True,
                'id': tweet.data['id'],
                'platform': 'x',
                'reply_to': tweet_id
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def capture_lead_from_dm(self, sender_id: str, message_text: str) -> Dict:
        """Capture lead from X DM"""
        from email_parser import parser
        
        # Parse the message
        parsed = parser.parse_text(message_text)
        
        lead = {
            'name': parsed.name or 'X Lead',
            'email': parsed.email,
            'phone': parsed.phone,
            'source': 'x_dm',
            'source_detail': f"Twitter/X DM from {sender_id}",
            'message': message_text[:500],
            'status': 'new',
            'temperature': 'warm' if parsed.email or parsed.phone else 'cold',
            'created_at': datetime.now().isoformat()
        }
        
        # Could also get user info via API
        # user_info = self.client.get_user(id=sender_id)
        
        return lead
    
    def schedule_post(self, content: str, scheduled_time: datetime) -> Dict:
        """
        Schedule a post for future
        Note: X API v2 doesn't support scheduling directly
        Requires external scheduler (like Make.com)
        """
        return {
            'success': True,
            'content': content,
            'scheduled_for': scheduled_time.isoformat(),
            'platform': 'x',
            'note': 'Use Make.com or cron to execute at scheduled time'
        }
    
    def get_engagement_stats(self, tweet_id: str) -> Dict:
        """Get engagement stats for a tweet"""
        try:
            tweet = self.client.get_tweet(
                tweet_id,
                tweet_fields=['public_metrics', 'created_at']
            )
            
            metrics = tweet.data.public_metrics
            
            return {
                'tweet_id': tweet_id,
                'likes': metrics.get('like_count', 0),
                'retweets': metrics.get('retweet_count', 0),
                'replies': metrics.get('reply_count', 0),
                'impressions': metrics.get('impression_count', 0),
                'platform': 'x'
            }
            
        except Exception as e:
            return {
                'error': str(e)
            }
    
    def get_mentions(self, limit: int = 10) -> List[Dict]:
        """Get recent mentions for auto-reply"""
        try:
            mentions = self.client.get_users_mentions(
                id=self.client.get_me().data.id,
                max_results=limit,
                tweet_fields=['created_at', 'author_id', 'conversation_id']
            )
            
            return [
                {
                    'id': tweet.id,
                    'text': tweet.text,
                    'author_id': tweet.author_id,
                    'created_at': tweet.created_at,
                    'conversation_id': tweet.conversation_id
                }
                for tweet in (mentions.data or [])
            ]
            
        except Exception as e:
            print(f"Error getting mentions: {e}")
            return []

# Global instance
x_platform = XPlatformIntegration()

# API functions
def create_x_post(content: str, options: Optional[Dict] = None) -> Dict:
    """Create post on X"""
    return x_platform.create_post(content, options)

def create_listing_post_x(property_data: Dict) -> Dict:
    """Create real estate listing post on X"""
    return x_platform.create_listing_post(property_data)

def verify_x_connection() -> Tuple[bool, str]:
    """Verify X connection"""
    return x_platform.verify_connection()

def auto_reply_to_mentions() -> List[Dict]:
    """Auto-reply to recent mentions"""
    mentions = x_platform.get_mentions(limit=5)
    replies = []
    
    for mention in mentions:
        # Generate AI reply
        reply_text = "Thanks for reaching out! Check your DMs for more info 👍"
        
        result = x_platform.reply_to_mention(
            mention['id'],
            mention.get('username', 'user'),
            reply_text
        )
        
        replies.append(result)
    
    return replies

if __name__ == '__main__':
    # Test connection
    connected, message = verify_x_connection()
    print(f"X Connection: {'✅' if connected else '❌'} {message}")
    
    if connected:
        # Test post
        result = create_x_post("Testing Clippy X integration 🚀")
        print(f"Post result: {result}")
