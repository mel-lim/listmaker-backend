// IMPORT DB ACCESS DETAILS
const db = require('./db');

// HELPER FUNCTION TO DELETE TRIP BY TRIP ID
const deleteTrip = async tripId => {
    return new Promise(async (resolve, reject) => {

        // Checkout/reserve a client for our transaction
        const client = await db.getClient();

        try {
            // Start the transaction on our checked out client 
            await client.query('BEGIN');

            // Query the list table to find the list ids associated with this trip
            const listIdResults = await client.query('SELECT id from list WHERE trip_id = $1', [tripId]);

            if (listIdResults.rows && listIdResults.rows.length) { // If there are lists for this trip

                // Create an array of list ids 
                const listIds = listIdResults.rows.map(item => item.id);

                // Iterate through the list ids and delete the list items associated with each list id
                await Promise.all(listIds.map(
                    async listId => {
                        const { rowCount } = await client.query("DELETE FROM list_item WHERE list_id = $1", [listId]);
                        console.log(`${rowCount} list items were deleted from list ${listId}`);
                    }
                ));

                // DELETE ALL LISTS ASSOCIATED WITH THIS TRIP
                await client.query("DELETE FROM list WHERE trip_id = $1", [tripId]);
                console.log("lists have been deleted")
            }

            // DELETE THE RELATIONSHIP BETWEEN TRIP AND APP_USER FROM THE APP_USERS_TRIPS TABLE
            await client.query("DELETE FROM app_users_trips WHERE trip_id = $1", [tripId]);
            console.log("app user / trip relationship has been deleted");

            // DELETE THE TRIP
            await client.query("DELETE FROM trip WHERE id = $1", [tripId]);
            console.log(`trip of id ${tripId} has been deleted`);

            // COMMIT THE TRANSACTION
            await client.query('COMMIT');
            console.log('committed');

            // Send back tripId on success
            resolve(tripId);
        }

        catch (error) {
            await client.query('ROLLBACK');
            console.error(`Error committing transaction to delete trip of id ${tripId}`, error.stack);
            reject(error); // If unsuccessful, send back the error
        }

        finally {
            client.release();
        }

    });
}

module.exports = {
    deleteTrip
}