# PROJECT: Laundry Shop POS & Management System

Act as a Senior Full-Stack Laravel Developer, Software Architect, and UI/UX Designer.

I want you to build a complete, production-ready Laundry Shop Point of Sale (POS) and Management System.

This is intended for a small laundry business in the Philippines. The primary users will be the shop's desk operators, not developers. Therefore, the system must prioritize simplicity, speed, usability, and a professional visual experience.

Do not just create a generic admin dashboard. Design an actual laundry shop operating system.

---

# 1. EXISTING PROJECT / STARTING TEMPLATE

I already have an existing React dashboard template:

GitLab Repository:
https://gitlab.com/czar.gaba/baseplate-react

This repository is my starting point for the frontend.

Important instructions:

1. Inspect the entire repository before making changes.
2. Understand its existing React architecture, dependencies, routing, components, Tailwind configuration, and design structure.
3. Preserve useful existing components and functionality.
4. You are explicitly allowed and expected to redesign the existing interface.
5. Do not simply retain the plain default Tailwind appearance.
6. Improve the visual design, component hierarchy, spacing, typography, colors, navigation, forms, tables, dialogs, and dashboard widgets.
7. Make the interface look like a polished commercial SaaS application.
8. Keep the code maintainable and reusable.

The existing Baseplate React template is intentionally simple. I want you to transform it into a beautiful, modern, professional laundry management dashboard.

If the repository is not already available locally, ask me to clone it or configure the working directory before proceeding. Do not pretend you have inspected files you cannot access.

---

# 2. TECHNOLOGY STACK

Backend:
- Laravel (use the latest stable version compatible with the environment).
- PHP.
- MySQL or MariaDB.
- Laravel Sanctum for authentication and API tokens.
- Laravel Form Requests for validation.
- Laravel API Resources for API responses.
- Eloquent ORM.
- Database migrations and seeders.

Frontend:
- Existing Baseplate React repository.
- React.
- TypeScript if the existing project supports it or can reasonably be migrated.
- Tailwind CSS.
- Existing UI libraries where appropriate.
- Lucide icons.
- React Router or the existing routing solution.
- Axios or an existing API client.

Architecture:
- API-first backend.
- Versioned API endpoints.
- Frontend communicates with Laravel through HTTP APIs.
- Keep business logic in Laravel, not in React components.

IMPORTANT:

Do not make the frontend dependent on Laravel Blade rendering.

The web dashboard must communicate with the Laravel backend through APIs. This is important because I may eventually build separate applications using:

- Capacitor for Android/iOS.
- Electron for desktop.

All these applications should be able to reuse the same Laravel backend and API.

Do not implement Capacitor or Electron now. Only make the architecture ready for them.

---

# 3. LOCAL DEVELOPMENT AND DEPLOYMENT

Initially, this application will run locally on my development machine.

I will manually deploy it later to my aaPanel Ubuntu VPS.

Development requirements:

- Support localhost development.
- Use environment variables for database credentials and API configuration.
- Do not hardcode localhost URLs.
- Do not hardcode production domains.
- Make the API base URL configurable.
- Configure CORS properly.
- Provide an example .env file.
- Include clear installation instructions.
- Include database migration and seeding commands.
- Include frontend and backend development commands.

Example environment configuration:

APP_NAME="Laundry POS"
APP_ENV=local
APP_DEBUG=true
APP_URL=http://localhost

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=laundry_pos
DB_USERNAME=root
DB_PASSWORD=

FRONTEND_URL=http://localhost:5173
SANCTUM_STATEFUL_DOMAINS=localhost,localhost:5173

VITE_API_BASE_URL=http://localhost:8000/api/v1

These are example values. Adjust them to the actual implementation.

Deployment preparation:

- Must support a manually configured production domain.
- Must work with aaPanel-managed Nginx or Apache.
- Must support HTTPS.
- Must not require Docker.
- Must not depend on a particular domain.
- Include production build instructions.
- Document the required Laravel storage permissions.
- Document queue and scheduler requirements if implemented.

Do not implement deployment automation unless specifically requested.

---

# 4. SYSTEM USERS AND PERMISSIONS

Implement role-based access control.

Initial roles:

### Owner / Administrator

Can:
- Access the entire system.
- Manage users and employees.
- Manage laundry services and pricing.
- Manage customers.
- View all transactions.
- View sales and financial reports.
- Manage payment settings.
- Manage system settings.
- View activity logs.

### Desk Operator

This is the primary user of the application.

Can:
- Register customers.
- Create laundry orders.
- Calculate laundry charges.
- Update order statuses according to permissions.
- Accept payments.
- Print receipts.
- Search and track laundry orders.
- Release completed laundry.
- View relevant daily transactions.

The desk operator should NOT need to navigate complicated administrative pages just to process a laundry transaction.

### Laundry Staff / Attendant

Can:
- View assigned or active laundry orders.
- Update laundry processing statuses.
- View relevant order details.

Restrict access according to role permissions.

Do not rely on frontend-only authorization. All permissions must also be enforced by Laravel.

---

# 5. CORE LAUNDRY MANAGEMENT FEATURES

## A. Dashboard

Create a visually attractive and useful dashboard.

Display:

- Today's total sales.
- Today's number of orders.
- Pending laundry orders.
- Orders currently processing.
- Orders ready for pickup.
- Unpaid balances.
- Recent transactions.
- Recent laundry orders.
- Sales overview chart.
- Laundry order status overview.

Use real database information, not hardcoded dashboard statistics.

Make the dashboard responsive and easy to understand.

## B. Customer Management

Customer information:

- Customer ID.
- Full name.
- Phone number.
- Email (optional).
- Address (optional).
- Notes.
- Date registered.

Features:

- Create customer.
- Edit customer.
- Search customer.
- View customer order history.
- View customer outstanding balances.
- View total customer spending.

Phone number should be the primary practical search field.

Allow quick customer registration directly from the POS transaction screen.

## C. Laundry Services and Pricing

Allow the administrator to configure laundry services.

Initial suggested services:

- Wash, Dry & Fold.
- Wash & Dry.
- Dry Only.
- Ironing.
- Dry Cleaning.
- Special Laundry Services.

Pricing must be configurable.

Support different pricing methods:

1. Per kilogram.
2. Per piece.
3. Fixed service price.

Example:

- Wash, Dry & Fold: ₱35/kg.
- Wash & Dry: ₱25/kg.
- Dry Only: ₱20/kg.
- Ironing: ₱15/piece.

These are sample prices only. They must be editable from the admin dashboard.

Allow optional additional charges:

- Fabric conditioner.
- Premium detergent.
- Express processing.
- Special handling.
- Other configurable add-ons.

Do not hardcode these prices into the frontend.

## D. Laundry POS / Order Processing

This is the MOST IMPORTANT MODULE.

Design the POS interface specifically for a desk operator.

The operator should be able to create a laundry transaction quickly without navigating multiple pages.

Suggested workflow:

1. Search for an existing customer or register a new one.
2. Select laundry service.
3. Enter laundry weight in kilograms or item quantity.
4. Add optional services.
5. Automatically calculate the subtotal.
6. Apply an authorized discount if applicable.
7. Calculate the total.
8. Enter payment amount.
9. Automatically calculate remaining balance.
10. Save the transaction.
11. Generate and print a receipt.

Order information:

- Unique order number.
- Customer.
- Order date.
- Expected completion date.
- Laundry service.
- Weight.
- Item quantity.
- Additional services.
- Subtotal.
- Discount.
- Total amount.
- Amount paid.
- Remaining balance.
- Payment status.
- Laundry status.
- Notes.
- Created by.

Order numbering should be human-readable.

Example:
LND-20261116-0001

Do not use database IDs as customer-facing order numbers.

Important POS requirements:

- Large readable buttons.
- Large input fields.
- Clear pricing calculations.
- Minimal unnecessary clicks.
- Keyboard-friendly interaction.
- Responsive layout.
- Clear success and error messages.
- Confirmation before destructive actions.

The interface should be optimized for a computer or laptop used at the laundry shop counter.

## E. Laundry Order Status Tracking

Implement the following statuses:

1. Received.
2. Washing.
3. Drying.
4. Folding.
5. Ready for Pickup.
6. Released.
7. Cancelled.

Allow authorized users to update statuses.

Show a visual order progress indicator.

Maintain an order status history containing:

- Previous status.
- New status.
- Updated by.
- Timestamp.
- Optional remarks.

The system must preserve transaction history.

## F. Payments

Support:

- Cash.
- GCash.
- Maya.
- Bank Transfer.
- Other configurable payment methods.

Payment features:

- Full payment.
- Partial payment.
- Multiple payments per order.
- Outstanding balance tracking.
- Payment history.
- Payment date and time.
- Payment reference number (optional).
- Payment receipt.

Payment statuses:

- Unpaid.
- Partially Paid.
- Paid.
- Refunded.

Do not assume an order is fully paid simply because a payment transaction was recorded.

Calculate balances accurately on the backend.

Prevent accidental duplicate payments.

Use database transactions when recording orders and their payments.

## G. Order Management

Create a dedicated order management page.

Features:

- Search by order number.
- Search by customer name.
- Search by customer phone number.
- Filter by date.
- Filter by laundry status.
- Filter by payment status.
- View order details.
- Update order status.
- Add payment.
- Print or reprint receipt.
- View order history.

Make the order details screen visually clear and easy to use.

## H. Receipt Printing

Generate professional laundry receipts.

Receipt should contain:

- Shop name.
- Shop address.
- Contact information.
- Order number.
- Customer name.
- Customer phone number.
- Transaction date.
- Laundry services.
- Weight or item quantity.
- Additional charges.
- Subtotal.
- Discount.
- Total.
- Amount paid.
- Outstanding balance.
- Expected pickup date.
- Laundry terms and reminders.

Design a compact thermal receipt layout suitable for 58mm and 80mm printers.

Initially, use browser-based printing.

Keep the receipt implementation extensible for future ESC/POS printer integration.

---

# 6. REPORTS AND BUSINESS MONITORING

Create reports for the owner.

Reports should include:

### Sales Report
- Daily sales.
- Weekly sales.
- Monthly sales.
- Custom date range.
- Total payments received.
- Outstanding balances.

### Laundry Orders Report
- Total orders.
- Orders by status.
- Completed orders.
- Cancelled orders.
- Average order value.

### Payment Report
- Cash collections.
- GCash collections.
- Maya collections.
- Bank transfers.
- Other payment methods.

Important:

Differentiate actual money collected from total order value.

For example, a ₱500 order with only ₱200 paid must contribute ₱200 to actual collections, not ₱500.

Include printable reports and CSV export if practical.

---

# 7. SYSTEM SETTINGS

Create an administration settings module.

Include:

- Laundry shop name.
- Business address.
- Contact number.
- Email.
- Logo.
- Currency.
- Default payment methods.
- Laundry service pricing.
- Order numbering configuration.
- Receipt footer.
- Default expected completion time.
- Tax and discount configuration where applicable.

Default currency:

PHP (₱)

Use Philippine Peso formatting consistently throughout the system.

---

# 8. DATABASE DESIGN

Create a normalized and maintainable database structure.

Suggested tables:

- users
- roles / permissions (if using a permissions package)
- customers
- laundry_services
- service_addons
- orders
- order_items
- order_addons
- payments
- payment_methods
- order_status_histories
- activity_logs
- settings

You may introduce additional tables when necessary.

Requirements:

- Use foreign keys.
- Add appropriate database indexes.
- Use decimal fields for monetary values.
- Never use floating-point values for financial calculations.
- Use database transactions for critical operations.
- Use soft deletes where appropriate.
- Preserve historical transaction information.
- Prevent deletion of records referenced by completed transactions.
- Store timestamps consistently.

Historical orders must retain their original prices even when the administrator changes service pricing later.

Use appropriate snapshots of service names and prices in order items.

---

# 9. API ARCHITECTURE

The Laravel backend must be API-ready from the beginning.

Use versioned routes:

/api/v1/

Suggested endpoints:

Authentication:
POST /api/v1/auth/login
POST /api/v1/auth/logout
GET /api/v1/auth/me

Dashboard:
GET /api/v1/dashboard

Customers:
GET /api/v1/customers
POST /api/v1/customers
GET /api/v1/customers/{id}
PUT /api/v1/customers/{id}
DELETE /api/v1/customers/{id}

Services:
GET /api/v1/services
POST /api/v1/services
PUT /api/v1/services/{id}
DELETE /api/v1/services/{id}

Orders:
GET /api/v1/orders
POST /api/v1/orders
GET /api/v1/orders/{id}
PUT /api/v1/orders/{id}
POST /api/v1/orders/{id}/status
GET /api/v1/orders/{id}/history

Payments:
GET /api/v1/orders/{id}/payments
POST /api/v1/orders/{id}/payments

Reports:
GET /api/v1/reports/sales
GET /api/v1/reports/orders
GET /api/v1/reports/payments

Settings:
GET /api/v1/settings
PUT /api/v1/settings

These are suggested routes. Adjust the actual implementation as necessary.

API requirements:

- Laravel Sanctum authentication.
- Token authentication for future mobile and desktop clients.
- Secure logout and token revocation.
- Role and permission authorization.
- Form Request validation.
- Consistent JSON response structure.
- Appropriate HTTP status codes.
- Pagination.
- Filtering and searching.
- API Resources.
- Error handling.
- Rate limiting for sensitive endpoints.

Use Sanctum's appropriate authentication approach for the browser SPA and personal access tokens for future external clients.

Do not expose sensitive information in API responses.

Create API documentation using a maintainable format such as OpenAPI or an equivalent documented endpoint reference.

The API must not depend on the React dashboard.

---

# 10. FRONTEND REDESIGN — VERY IMPORTANT

I want you to put considerable effort into redesigning my existing Baseplate React dashboard.

The existing template is too plain and looks like a basic Tailwind starter project.

I want a professional commercial POS interface.

Design inspiration:

- Modern SaaS dashboards.
- Premium POS systems.
- Modern retail management applications.
- Clean business management software.

Do not copy another product exactly.

### Visual Direction

Use a modern, clean, premium interface.

Suggested design characteristics:

- Neutral light background.
- White or subtly tinted surfaces.
- Refined typography.
- Professional color palette.
- Consistent border radius.
- Subtle shadows.
- Clear visual hierarchy.
- Modern iconography.
- Well-designed tables.
- Clean form layouts.
- Thoughtful empty states.
- Elegant dialogs and dropdowns.
- Consistent spacing.
- Beautiful charts and summary cards.

Avoid:

- Plain unstyled Tailwind components.
- Excessive gradients.
- Too many colorful cards.
- Oversized dashboard statistics.
- Excessive borders.
- Unnecessary animations.
- Cluttered interfaces.
- Tiny buttons.
- Generic admin template appearance.

### Desk Operator Experience

The desk operator is the main user.

The POS must be the easiest and most polished section of the application.

Prioritize:

- Fast customer lookup.
- Quick order creation.
- Clear service selection.
- Easy weight entry.
- Automatic price calculation.
- Visible order totals.
- Easy payment processing.
- Simple receipt printing.
- Easy order tracking.

Use a dedicated POS layout rather than forcing the operator to work through a generic admin interface.

Consider a two-column POS layout:

Left:
- Customer selection.
- Laundry service selection.
- Weight and quantity inputs.
- Additional services.

Right:
- Order summary.
- Subtotal.
- Discounts.
- Total.
- Payment amount.
- Remaining balance.
- Complete transaction button.

Make the layout responsive.

The operator should immediately understand what to do without training.

### Navigation

Use a clean sidebar with logical groupings:

OVERVIEW
- Dashboard

LAUNDRY OPERATIONS
- Point of Sale
- Orders
- Customers
- Laundry Tracking

MANAGEMENT
- Services & Pricing
- Payments
- Reports

ADMINISTRATION
- Users
- Activity Logs
- Settings

Show navigation items according to user permissions.

Do not show irrelevant administrative options to desk operators.

### Reusable Components

Create reusable components for:

- Page headers.
- Sidebar.
- Top navigation.
- Breadcrumbs.
- Statistic cards.
- Data tables.
- Search fields.
- Filters.
- Form fields.
- Select inputs.
- Status badges.
- Confirmation dialogs.
- Toast notifications.
- Empty states.
- Loading states.
- Pagination.
- Receipt layouts.

Maintain consistent design throughout the application.

---

# 11. SECURITY AND DATA INTEGRITY

Implement:

- Secure password hashing.
- Authentication middleware.
- Authorization policies.
- Role-based access control.
- CSRF protection where applicable.
- API rate limiting.
- Input validation.
- SQL injection protection through Eloquent and parameterized queries.
- Secure file uploads.
- Audit logging for important operations.
- Database transaction protection.
- Protection against duplicate submissions.

Do not expose environment variables or application secrets.

Do not trust frontend-submitted prices or totals.

All financial calculations must be validated and recalculated by Laravel.

The backend must be the source of truth.

---

# 12. TESTING

Create tests for important business operations.

Prioritize:

- Authentication.
- User permissions.
- Customer creation.
- Laundry order creation.
- Service pricing calculations.
- Add-on calculations.
- Discounts.
- Partial payments.
- Full payments.
- Outstanding balances.
- Duplicate payment prevention.
- Order status transitions.
- Historical pricing preservation.
- Receipt data.

Ensure that critical business operations work before focusing on cosmetic details.

---

# 13. DEVELOPMENT WORKFLOW

Do not attempt to build everything in one uncontrolled operation.

Work in clearly defined phases.

### Phase 1: Project Inspection and Architecture

- Inspect Baseplate React.
- Inspect the current working directory.
- Identify existing dependencies.
- Decide the best integration structure.
- Propose the backend/frontend folder organization.
- Identify reusable components.
- Create an implementation plan.

Do not destroy existing working code.

### Phase 2: Laravel Backend

- Initialize Laravel.
- Configure database.
- Create migrations.
- Create models and relationships.
- Implement authentication.
- Implement roles and permissions.
- Implement API endpoints.
- Implement business logic.
- Create seeders.
- Implement validation and error handling.

### Phase 3: Frontend Redesign

- Redesign Baseplate React.
- Create the new visual system.
- Implement the application layout.
- Create the sidebar and navigation.
- Create dashboard pages.
- Create reusable components.
- Create the dedicated POS interface.
- Ensure responsive behavior.

### Phase 4: Integration

- Connect React to Laravel APIs.
- Implement authentication.
- Implement protected routes.
- Connect customer management.
- Connect laundry services.
- Connect POS transactions.
- Connect payments.
- Connect order tracking.
- Connect reports.

### Phase 5: Testing and Refinement

- Test all major workflows.
- Fix API integration issues.
- Fix calculation errors.
- Improve UI/UX.
- Test different screen sizes.
- Test operator workflows.
- Verify authorization.
- Verify database integrity.

### Phase 6: Documentation

Create:

- README.md
- .env.example
- Database setup instructions.
- Local development instructions.
- API documentation.
- Production deployment instructions for aaPanel.
- Default development credentials.
- Seed data instructions.

---

# 14. IMPORTANT INSTRUCTIONS FOR THE AI CODING AGENT

I use OpenCode with DeepSeek or MiMo models.

Please follow these instructions carefully:

1. Inspect the actual source code before editing.
2. Never assume that a component, dependency, route, or file exists.
3. Do not unnecessarily rewrite working components.
4. Do not generate fake functionality or buttons that do nothing.
5. Do not use hardcoded dashboard statistics.
6. Do not put business logic inside React components.
7. Do not hardcode API URLs.
8. Do not hardcode prices.
9. Do not trust frontend calculations for financial transactions.
10. Use clean Laravel conventions.
11. Use reusable React components.
12. Maintain consistent naming conventions.
13. Avoid unnecessary dependencies.
14. Keep the implementation understandable and maintainable.
15. Do not introduce Docker requirements.
16. Do not implement Capacitor or Electron yet.
17. Do not leave critical features as TODO placeholders.
18. Do not sacrifice functionality for visual appearance.
19. Do not sacrifice visual quality for functionality.

If a feature is too large, implement it in smaller, working steps.

After completing each phase:

- Explain what was implemented.
- List the files created or modified.
- Report any remaining issues.
- Explain how to test the implementation.
- Continue to the next phase when the current phase is verified.

Do not stop after generating a plan. Proceed with implementation once the architecture is understood.

If an important architectural decision is unclear, explain the issue and ask before making a destructive or irreversible change.

---

# FINAL OBJECTIVE

I want a fully functional, beautiful, and reliable Laundry Shop POS system.

The desk operator should be able to:

1. Open the application.
2. Search or register a customer.
3. Create a laundry order.
4. Enter the laundry weight or quantity.
5. Select the appropriate service.
6. Automatically calculate the price.
7. Accept full or partial payment.
8. Print a receipt.
9. Track the laundry's progress.
10. Release the laundry when completed.

The owner should be able to manage services, employees, transactions, payments, and business reports.

The Laravel backend should expose a reusable API so that I can eventually connect a Capacitor mobile application or Electron desktop application without rebuilding the business logic.

The initial application must work locally and be straightforward to deploy manually to my aaPanel Ubuntu VPS later.

Most importantly, make the frontend look like a polished, premium laundry business management application rather than a plain Tailwind admin dashboard.

Start by inspecting the existing Baseplate React repository and preparing the implementation architecture.