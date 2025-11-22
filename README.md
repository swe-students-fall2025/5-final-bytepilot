# Forum Generator

Forum Generator is a containerized system that allows users to create and manage virtual characters, automatically generating fan fiction dialogues with authentic forum styling. The system uses MongoDB to store character information and a Flask web application to provide the user interface and forum generation functionality.


## Architecture

The system runs as two Docker containers via `docker-compose`:

- **Web App**

    - User interface for inputting character information and dialogue content

    - Generates and displays forum-style formatting

    - Manages character information

- **MongoDB**

    - Stores character information (name, avatar, description, etc.)

    - Stores forum templates and styles

## Team

- [May Zhou](https://github.com/zz4206)
- [Morin Zhou](https://github.com/Morinzzz)
- [Jasmine Zhu](https://github.com/jasminezjr)
- [Esther Feng](https://github.com/yf2685-beep)
