-- Separately reviewed operator recipe, never run by the application or migration.
-- From the repository root: psql -X -v ON_ERROR_STOP=1 -v expected_database=... -v expected_checksum=... -f server/db/contact/runtime-role.sql
-- Use the independently verified target connection; no passwords in this file or CLI.
BEGIN;
SELECT pg_advisory_xact_lock(420017835);
SELECT set_config('blum_studio_contact.expected_database', :'expected_database', true);
SELECT set_config('blum_studio_contact.expected_checksum', :'expected_checksum', true);
DO $$
DECLARE r record;
BEGIN
  IF current_database() <> current_setting('blum_studio_contact.expected_database') OR
    obj_description('blum_studio_contact'::regnamespace,'pg_namespace') IS DISTINCT FROM
      'blum-studio:studio_contact_001:' || current_setting('blum_studio_contact.expected_checksum') THEN
    RAISE EXCEPTION 'Contact target/schema confirmation mismatch';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='blum_studio_contact') THEN
    CREATE ROLE blum_studio_contact NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
  END IF;
  SELECT * INTO r FROM pg_roles WHERE rolname='blum_studio_contact';
  IF r.rolsuper OR r.rolcreatedb OR r.rolcreaterole OR r.rolreplication OR r.rolbypassrls OR
    EXISTS(SELECT 1 FROM pg_auth_members WHERE member=r.oid) OR
    EXISTS(SELECT 1 FROM pg_shdepend WHERE refclassid='pg_authid'::regclass AND refobjid=r.oid AND deptype='o') THEN
    RAISE EXCEPTION 'Runtime role must be unprivileged, independent and own nothing';
  END IF;
  IF has_database_privilege(r.oid,current_database(),'CREATE') OR has_database_privilege(r.oid,current_database(),'TEMP') OR
    EXISTS(SELECT 1 FROM pg_namespace WHERE nspname NOT LIKE 'pg_%' AND nspname <> 'information_schema' AND has_schema_privilege(r.oid,oid,'CREATE')) OR
    EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname NOT IN ('blum_studio_contact','information_schema') AND n.nspname NOT LIKE 'pg_%' AND c.relkind IN ('r','p','v','m','f')
      AND (has_table_privilege(r.oid,c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') OR has_any_column_privilege(r.oid,c.oid,'SELECT,INSERT,UPDATE,REFERENCES'))) OR
    EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE (n.nspname NOT LIKE 'pg_%' AND n.nspname <> 'information_schema' OR p.prosecdef) AND has_function_privilege(r.oid,p.oid,'EXECUTE')) THEN
    RAISE EXCEPTION 'Unexpected inherited/public privileges; review separately, do not change shared grants automatically';
  END IF;
END $$;
GRANT CONNECT ON DATABASE :"expected_database" TO blum_studio_contact;
REVOKE ALL ON SCHEMA blum_studio_contact FROM blum_studio_contact;
GRANT USAGE ON SCHEMA blum_studio_contact TO blum_studio_contact;
REVOKE ALL ON ALL TABLES IN SCHEMA blum_studio_contact FROM blum_studio_contact;
GRANT SELECT, INSERT ON blum_studio_contact.messages TO blum_studio_contact;
GRANT UPDATE (request_fingerprint) ON blum_studio_contact.messages TO blum_studio_contact;
COMMIT;
-- Keep NOLOGIN until separately approved credentials are provisioned privately.
-- Re-run the unchanged Chicks runtime-role verification against chicks_runtime.
