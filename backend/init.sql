CREATE TABLE Station (
  id SERIAL PRIMARY KEY,
  name VARCHAR NOT NULL,
  apiUrl VARCHAR NOT NULL,
  latitude FLOAT,
  longitude FLOAT
);

CREATE TABLE TideReading (
  id SERIAL PRIMARY KEY,
  stationId INT NOT NULL REFERENCES Station(id),
  timestamp TIMESTAMP NOT NULL,
  tide FLOAT NOT NULL
);
