DROP TABLE IF EXISTS users;
CREATE TABLE users (id INT, username TEXT, password TEXT, PRIMARY KEY (`id`));
INSERT INTO users (id, username, password) VALUES (1, 'amolele@gmail.com', '$2a$10$Nka3T3Bzv/QWTkOyuLA0ROELOdBXPpIYkJgNxduEdzO/GKw6ObrHS');

DROP TABLE IF EXISTS pastes;
CREATE TABLE pastes(id TEXT, content TEXT, user_id INT, FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
INSERT INTO pastes (id, content, user_id) VALUES ('kulilokanu', 'https://google.com', 1);
