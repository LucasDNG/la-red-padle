BEGIN;

DO $$
DECLARE
  duplicate_digits bigint;
  blank_digits bigint;
BEGIN
  SELECT count(*) INTO duplicate_digits
  FROM (
    SELECT regexp_replace(phone, '\D', '', 'g') AS digits
    FROM users
    GROUP BY 1
    HAVING count(*)>1
  ) d;
  IF duplicate_digits>0 THEN
    RAISE EXCEPTION 'No se puede unificar users.phone: hay teléfonos que coinciden al comparar solo dígitos';
  END IF;

  SELECT count(*) INTO blank_digits
  FROM users
  WHERE regexp_replace(phone, '\D', '', 'g')='';
  IF blank_digits>0 THEN
    RAISE EXCEPTION 'No se puede unificar users.phone: hay teléfonos sin dígitos';
  END IF;
END $$;

UPDATE users
SET phone=regexp_replace(phone, '\D', '', 'g'),
    updated_at=CURRENT_TIMESTAMP
WHERE phone<>regexp_replace(phone, '\D', '', 'g');

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_phone ON users(phone);

COMMIT;
