create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'resolver-torneos-online',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://tecnico-de-la-cancha.vercel.app/api/resolver-torneos',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-resolver-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'torneo_resolver_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);