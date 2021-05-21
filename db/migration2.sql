ALTER TABLE list_item
ADD COLUMN is_deleted BOOLEAN DEFAULT false;

ALTER TABLE app_user
ADD COLUMN is_guest BOOLEAN DEFAULT false;

ALTER TABLE app_user
ADD COLUMN is_admin BOOLEAN DEFAULT false;

INSERT INTO template_list_item (name, list_id)
VALUES ('Navigation - phone, GPS device, map/compass', 1);
