"""Add stats streak fields

Revision ID: 203fdfb0872d
Revises: a1b2c3d4e5f6
Create Date: 2026-05-11 17:22:40.615627

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "203fdfb0872d"
down_revision = "a1b2c3d4e5f6"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("stats", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column(
                "current_streak",
                sa.Integer(),
                nullable=False,
                server_default="0"
            )
        )
        batch_op.add_column(
            sa.Column(
                "best_streak",
                sa.Integer(),
                nullable=False,
                server_default="0"
            )
        )


def downgrade():
    with op.batch_alter_table("stats", schema=None) as batch_op:
        batch_op.drop_column("best_streak")
        batch_op.drop_column("current_streak")