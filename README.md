# bManager fixed build

This build keeps the existing frontend format/styles and moves the inventory, sales, and profit calculations behind the backend API.

## Business flow

### Inventory Center
For a selected day:

- Opening inventory = previous day's remaining stock.
- Current inventory = opening inventory + today's new order.
- Today's remaining stock is the closing stock.
- That closing stock becomes the next day's opening inventory.

The user only enters:
- New Order
- Remaining Stock

### Daily Sales Center
For each product:

`Opening + New Order - Closing = Quantity Sold`

### Monthly Sales Center
The same daily formula is applied to every recorded day in the selected month, then all daily quantities and values are added together.

### Profit Center
1. Select Daily or Monthly.
2. The app shows only products that had sales in that selected period.
3. Enter Actual Value = unit cost.
4. Sales Value comes from the sales report.
5. Total Cost = quantity sold x unit cost.
6. Profit = Sales Value - Total Cost.

## Security

- Login/register uses bcrypt password hashing.
- Protected application APIs require a JWT.
- Protected pages require a login session.
- API CORS is restricted to the local bManager server origins.
- Google Sign-In verifies the Google ID token signature, issuer, audience and expiry on the backend.
- No MongoDB password or JWT secret is included in this delivery zip.

## Google setup

The Google button is wired into the app, but Google requires your own Web Client ID.

Add this line to your existing `backend/.env`:

`GOOGLE_CLIENT_ID=your_google_web_client_id`

Do not replace or remove your existing `MONGO_URI`, `JWT_SECRET`, or other working values.

For local development, configure the Google Web application's authorized JavaScript origin for your bManager address, normally `http://localhost:3000`.

## Android / Termux

Keep your existing `.env` and `node_modules`.

After replacing the source files, run:

`cd /storage/emulated/0/bManager/backend`

`node --check server.js`

`node server.js`

Then open bManager in the browser through the running server and log in.
