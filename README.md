First commit - 26 March 2021

I've set up a separate repo to work on the backend of my backcountry listmaker, to ensure the integrity of the front-end files, given this is my first end-to-end project, and I am learning as I build. 

I have set up a PostgresSQL db and the 'phase 1' tables in accordance with the provided schema (v2). Phase 1 is the individual listmaker web app. Phase 2 will add the team-based functionality. 

I have created an Express.js app which successfully connects to and queries from the the listmaker-end-to-end db, using the node-postgres library. 

My next step is to create a testing suite to streamline my other routes and facilitate refactoring. Stay tuned.

