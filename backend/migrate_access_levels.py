#!/usr/bin/env python3
"""
Migration script to add access_level to existing users
"""
import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Role to access level mapping
ROLE_ACCESS_MAP = {
    'owner': 'full',
    'master': 'edit',
    'crew': 'edit',
    'designated_person': 'view',
    'inspector': 'view'
}

async def migrate():
    # Connect to MongoDB
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    print("🔄 Starting access level migration...")
    
    # Get all users without access_level
    users = await db.users.find({}).to_list(1000)
    
    updated_count = 0
    for user in users:
        role = user.get('role', 'crew')
        access_level = user.get('access_level')
        
        # If user doesn't have access_level, set it based on role
        if not access_level:
            default_access = ROLE_ACCESS_MAP.get(role, 'edit')
            
            result = await db.users.update_one(
                {'id': user['id']},
                {'$set': {'access_level': default_access}}
            )
            
            if result.modified_count > 0:
                updated_count += 1
                print(f"✅ Updated {user.get('email')} ({role}) → {default_access}")
    
    print(f"\n✨ Migration complete! Updated {updated_count} users.")
    
    client.close()

if __name__ == '__main__':
    asyncio.run(migrate())
