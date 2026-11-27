# PULSE — Website Redesign & Homepage Routing Audit

## 1. Current Route Structure
- `/` (`frontend/app/page.tsx`): Public landing page.
- `/login` (`frontend/app/login/page.tsx`): Google Sign-In page.
- `/home` (`frontend/app/home/page.tsx`) & `/dashboard` (`frontend/app/dashboard/page.tsx`): Authenticated dashboard.
- Protected feature routes: `/transactions`, `/analytics`, `/forecast`, `/recurring`, `/goals`, `/simulator`, `/copilot`, `/notifications`, `/profile`, `/settings`.
- `*` (`frontend/app/not-found.tsx`): Custom 404 page.
- Error boundary: `frontend/app/error.tsx`.

## 2. Root Cause of the Homepage Routing Bug
1. **`frontend/app/page.tsx` (lines 45–53)**: Contains a `useEffect` that executes `if (!loading && user) { router.replace("/home"); }` and an early return `if (loading || user) { return <BrandedLoader message="Opening PULSE" />; }`. This prevents any authenticated user from ever viewing `/`—even after refreshing `/` or clicking a link to `/`.
2. **`frontend/components/app-shell.tsx` (line 95)**: The PULSE logo in the authenticated sidebar links to `/home` rather than `/`, and there is no "Website" / "Visit Homepage" link in the sidebar to return to `/`.

## 3. Current Design Problems
- **Overly Dark Theme**: `frontend/app/globals.css` and `providers.tsx` force a dark espresso theme (`#17120F` / `#211812`) across the entire product, which feels heavy for extended student financial planning.
- **Incomplete Landing Page**: Lacks a dedicated navigation bar with smooth-scroll section links, and omits several storytelling sections (Spending intelligence, Financial forecasting, Savings goals, Purchase simulator showcase, AI Copilot showcase, How PULSE works, and structured Footer).
- **Inconsistent Chart & Card Surfaces**: Charts and cards are built on dark `#2A211B` surfaces rather than warm ivory (`#F5F1EA`), soft cream (`#F0ECE5`), crisp white (`#FFFFFF`), copper (`#B87950`), muted plum/lavender (`#89769D` / `#EAE3F1`), blue (`#526C9C` / `#DCE5F6`), and sage (`#DDE8D8` / `#54734C`).

## 4. Proposed Component & Design System Changes
1. **Routing Fix**:
   - Remove the `/` -> `/home` redirect from `frontend/app/page.tsx` so `/` always renders the public marketing homepage for both logged-out and logged-in visitors.
   - Dynamically switch the `/` primary CTA to **"Open Dashboard"** (`/home`) when `user` is authenticated, or **"Get Started"** (`/login`) when logged out.
   - Update `AppShell` PULSE logo to link to `/` and add a **"Website"** link in the sidebar.
2. **Light-First Design System (`frontend/app/globals.css`)**:
   - Define semantic tokens for `#F5F1EA`, `#F0ECE5`, `#FFFFFF`, `#FBFAF7`, `#29231F`, `#766E66`, `#A49A90`, `#B87950`, `#945F40`, `#E8CBA8`, `#89769D`, `#EAE3F1`, `#F3EFF7`, `#DCE5F6`, `#526C9C`, `#DDE8D8`, `#54734C`, `#F7EEDC`, `#F6E7E3`, `#E9E4DC`, `#DCD4C9`.
   - Add subtle architectural grid/radial pattern utilities and shared `.pulse-card` / `.pulse-surface` classes.
3. **Shared UI & States**:
   - Update `BrandedLoader`, `DashboardSkeleton`, `ListSkeleton`, `not-found.tsx`, and `error.tsx` to warm ivory light surfaces.
4. **3D Hero & Complete 12-Section Landing Page**:
   - Build a light-first `Pulse3DHero` with interlocking copper/champagne/lavender orbital rings, central translucent sphere, and floating UI preview cards.
   - Build all 12 landing page sections with human, student-focused copy and zero developer jargon.
5. **Authenticated Pages**:
   - Redesign `/home`, `/transactions`, `/analytics`, `/forecast`, `/recurring`, `/goals`, `/simulator`, `/copilot`, `/notifications`, `/profile`, and `/settings` with consistent light-first styling, readable charts, and responsive mobile layouts.

## 5. Potential Functional Risks
- Removing `dark` class enforcement must not break Recharts tooltips, progress bars, or form inputs.
- Ensuring `/` never blocks on `loading` avoids any blank screen or redirect flicker when Firebase initializes.
- All backend API contracts (`/api/v1/*`) and Firebase Google Sign-In must remain untouched.
