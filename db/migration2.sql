ALTER TABLE list_item
ADD COLUMN is_deleted BOOLEAN DEFAULT false;

ALTER TABLE app_user
ADD COLUMN is_guest BOOLEAN DEFAULT false;

CREATE TABLE admin (
id SERIAL PRIMARY KEY,
username VARCHAR (20)
);

INSERT INTO admin (username) 
VALUES ('admin');

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO me;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO me;

DELETE FROM app_user
WHERE is_guest = true AND date_created < 'Today, 01:56:33 -07';
