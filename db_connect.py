import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

# Database connection
conn = psycopg2.connect(os.getenv('DATABASE_URL'))
cur = conn.cursor()

# Test connection
cur.execute("SELECT version();")
print("Connected successfully!")
print(cur.fetchone())

cur.close()
conn.close()