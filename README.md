# MazeSolver
MazeSolver is a website that allows you to create your own maze and then have the computer solve it using an optimized A* algorithm.

## Installation

Follow these steps to install and run the MazeSolver project locally using Docker you need to have Docker installed on your machine. If you don't have Docker installed, you can download it from the official website: [Docker](https://www.docker.com/get-started).

1. **Clone the repository**:

   Clone the MazeSolver GitHub repository to your local machine:

   `git clone https://github.com/teunvanderploeg/mazeSolver.git`

2. **Navigate to the project directory**:

   Change into the project directory where the Dockerfile is located:

   `cd mazeSolver`

3. **Build the Docker image**:

   Build a Docker image for the MazeSolver project:

   `docker build -t mazesolver .`

4. **Run the Docker container**:

   Start the Docker container using the built image:

   `docker run -d -p 80:80 mazesolver`

   This command runs the MazeSolver application in a Docker container, making it accessible on port 80 of your local machine.

5. **Open the application in your web browser**:

   Open your web browser and navigate to `http://localhost` to access the MazeSolver application.

By following these steps, you will have the MazeSolver project up and running using Docker, without needing to manually set up a web server.

## Features
- Easily draw your own maze by adding or removing walls.
- Let the computer solve the maze using the A* algorithm, one of the most efficient and popular pathfinding algorithms.
- Follow the algorithm step-by-step as it solves the maze, including the considerations and decisions it makes.


## Screenshot of the Website
![MazeSolver](/images/screenshot_of_website.png)