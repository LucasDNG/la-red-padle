SELECT 'users' table_name,count(*) FROM users;
SELECT 'leagues' table_name,count(*) FROM leagues;
SELECT 'categories' table_name,count(*) FROM categories;
SELECT c.league_id,c.number,count(*) FROM categories c GROUP BY c.league_id,c.number HAVING count(*)<>1;
SELECT category_id,position,count(*) FROM pairs WHERE competition_state<>'inactive' GROUP BY category_id,position HAVING count(*)>1;
SELECT user_id,count(*) FROM active_pair_memberships GROUP BY user_id HAVING count(*)>1;
SELECT pair_id,count(*) FROM wheel_assignment_participants GROUP BY pair_id HAVING count(*)>1;
SELECT wa.id FROM wheel_assignments wa JOIN pairs a ON a.id=wa.pair_a_id JOIN pairs b ON b.id=wa.pair_b_id WHERE wa.status IN('open','result_pending','disputed') AND (a.category_id<>wa.category_id OR b.category_id<>wa.category_id);
SELECT m.id FROM matches m WHERE m.winner_pair_id NOT IN(m.pair_a_id,m.pair_b_id);
SELECT id FROM discipline_reports WHERE reason='other' AND (details IS NULL OR length(trim(details))=0);


SELECT u.id
FROM users u
LEFT JOIN identity_documents d ON d.user_id=u.id
WHERE u.verification_status='pending'
  AND d.user_id IS NULL
  AND u.identity_resubmit_requested_at IS NULL;


SELECT u.id
FROM users u
JOIN identity_documents d ON d.user_id=u.id
WHERE u.identity_resubmit_requested_at IS NOT NULL;
