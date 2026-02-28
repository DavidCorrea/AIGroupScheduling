-- Migration: allow multiple availability blocks per member per weekday (drop unique on member_id, weekday_id).

DROP INDEX IF EXISTS "member_availability_member_id_weekday_id_unique";
