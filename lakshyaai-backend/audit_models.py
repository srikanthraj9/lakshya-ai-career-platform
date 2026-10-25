import inspect
from sqlalchemy import ForeignKey, Index, inspect as sa_inspect
from app.db import models

classes = [cls for name, cls in inspect.getmembers(models, inspect.isclass) if hasattr(cls, '__tablename__')]

print(f"Total tables: {len(classes)}")

fk_without_cascade = []
rels_without_cascade = []
unindexed_fks = []
vector_columns = []

for cls in classes:
    table = cls.__table__
    indexed_cols = set()
    for idx in table.indexes:
        for col in idx.columns:
            indexed_cols.add(col.name)
    for col in table.columns:
        if col.primary_key or col.unique or col.index:
            indexed_cols.add(col.name)
            
        # Check pgvector
        if "Vector" in str(col.type):
            vector_columns.append((table.name, col.name, str(col.type)))
            
        # Check foreign keys
        for fk in col.foreign_keys:
            if not fk.ondelete or fk.ondelete.upper() != "CASCADE":
                fk_without_cascade.append((table.name, col.name, fk.target_fullname, fk.ondelete))
            if col.name not in indexed_cols:
                unindexed_fks.append((table.name, col.name, fk.target_fullname))

    # Check relationships on the mapper
    mapper = sa_inspect(cls)
    for rel in mapper.relationships:
        if rel.direction.name in ("ONETOMANY", "MANYTOMANY"):
            cascade_rules = str(rel.cascade)
            if "delete" not in cascade_rules:
                rels_without_cascade.append((cls.__name__, rel.key, rel.direction.name, cascade_rules))

print(f"\n--- Foreign Keys without ondelete='CASCADE' ({len(fk_without_cascade)}) ---")
for t, col, target, ondelete in fk_without_cascade:
    print(f"  {t}.{col} -> {target} (ondelete={ondelete})")

print(f"\n--- One-to-Many / Many-to-Many Relationships without delete cascade ({len(rels_without_cascade)}) ---")
for model, rel, direction, cascade in rels_without_cascade:
    print(f"  {model}.{rel} ({direction}) cascade='{cascade}'")

print(f"\n--- Foreign Key Columns without explicit index ({len(unindexed_fks)}) ---")
for t, col, target in unindexed_fks:
    print(f"  {t}.{col} -> {target}")

print(f"\n--- Vector columns ({len(vector_columns)}) ---")
for t, col, tpe in vector_columns:
    print(f"  {t}.{col}: {tpe}")
