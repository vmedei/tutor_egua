"""add session proficiency snapshot

Revision ID: 9c1d2e3f4a5b
Revises: bde5a891d3b4
Create Date: 2026-06-18 19:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "9c1d2e3f4a5b"
down_revision: Union[str, None] = "bde5a891d3b4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("sessao", sa.Column("proficiencia_antes", sa.Float(), nullable=True))
    op.add_column("sessao", sa.Column("proficiencia_depois", sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_column("sessao", "proficiencia_depois")
    op.drop_column("sessao", "proficiencia_antes")
