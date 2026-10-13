ALTER TABLE accounts
  ADD COLUMN phone varchar(32),
  ADD COLUMN address_line1 varchar(120),
  ADD COLUMN address_line2 varchar(120),
  ADD COLUMN city varchar(80),
  ADD COLUMN region varchar(80),
  ADD COLUMN postal_code varchar(20),
  ADD COLUMN country varchar(80);
