# How to Fix the "Database Error" on Signup

The "Database Error" you encountered occurs because the database is stricter than the website. The website allows users to select new roles like **Marketing** and **Sales**, but the database has a "Check Constraint" that only allows older roles (like *team_member*, *admin*, *developer*, etc.).

## The Fix

I have already updated the website code to handle this gracefully (users will register as "team_member" initially but with a tag showing they wanted to be "marketing" or "sales").

**To permanently fix the database so it accepts these roles directly:**

1. Go to your **Supabase Dashboard**.
2. Open the **SQL Editor**.
3. Click **New Query**.
4. Copy and paste the code from the file: `scripts/029_add_marketing_sales_roles.sql`.
5. Click **Run**.

Once you do this, the database will legally accept "marketing" and "sales" as valid roles.
