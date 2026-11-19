-- Club sports plan practices, not runs: technique, tactics, game play, matches, sparring, swim sets.
alter table public.training_sessions drop constraint if exists training_sessions_category_check;
alter table public.training_sessions add constraint training_sessions_category_check check (category in (
  'easy', 'recovery', 'long', 'tempo', 'threshold', 'intervals', 'fartlek', 'hills',
  'progression', 'race_pace', 'test', 'race', 'custom_run',
  'strength', 'power', 'circuit', 'mobility', 'motor_prep', 'other',
  'technique', 'tactics', 'game', 'match', 'sparring', 'swim'));
