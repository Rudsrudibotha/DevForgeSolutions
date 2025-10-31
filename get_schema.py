import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

conn = psycopg2.connect(os.getenv('DATABASE_URL'))
cur = conn.cursor()

# Get table schema
cur.execute("""
SELECT 
    t.table_name,
    c.column_name,
    c.data_type,
    c.is_nullable,
    c.column_default
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_schema = 'public' 
AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name, c.ordinal_position;
""")

schema = cur.fetchall()
current_table = None

for row in schema:
    table_name, column_name, data_type, is_nullable, column_default = row
    if table_name != current_table:
        print(f"\n-- {table_name}")
        current_table = table_name
    nullable = "NULL" if is_nullable == "YES" else "NOT NULL"
    default = f" DEFAULT {column_default}" if column_default else ""
    print(f"  {column_name} {data_type} {nullable}{default}")

cur.close()
conn.close()