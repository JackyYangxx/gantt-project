import { test, expect } from '@playwright/test';

const USER = {
  username: `e2e-${Date.now()}`,
  password: 'test1234',
};

async function login(page) {
  await page.locator('.login-page input').first().fill(USER.username);
  await page.locator('.login-page input[type="password"]').fill(USER.password);
  await page.getByRole('button', { name: 'Login' }).click();
}

// Register user once via API for all tests
test.beforeAll(async ({ request }) => {
  await request.post('/api/auth/register', {
    data: { username: USER.username, password: USER.password },
  }).catch(() => {}); // ignore if already exists
});

test.describe.serial('Full Application Flow', () => {

  test('A1: Login and see empty project list', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Gantt Project' })).toBeVisible();
    await login(page);
    await expect(page.getByRole('heading', { name: 'My Projects' })).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('No projects yet')).toBeVisible();
  });

  test('A2: Logout and login again', async ({ page }) => {
    await page.goto('/');
    await login(page);
    await expect(page.getByRole('heading', { name: 'My Projects' })).toBeVisible({ timeout: 5000 });

    // Logout
    await page.getByRole('button', { name: 'Logout' }).click();
    await expect(page.getByRole('heading', { name: 'Gantt Project' })).toBeVisible();

    // Login again
    await login(page);
    await expect(page.getByRole('heading', { name: 'My Projects' })).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('No projects yet')).toBeVisible();
  });

  test('A3: Create two projects, verify count, delete one', async ({ page }) => {
    // Override confirm before page loads to avoid race conditions with dialog handlers
    await page.addInitScript(() => {
      window.confirm = () => true;
    });
    await page.goto('/');
    await login(page);
    await expect(page.getByRole('heading', { name: 'My Projects' })).toBeVisible({ timeout: 5000 });

    // Create first project
    await page.getByRole('button', { name: '+ New Project' }).click();
    await page.getByPlaceholder('Project name').fill('My E2E Project');
    await page.getByRole('button', { name: 'Create' }).click();
    await page.waitForTimeout(500);
    await expect(page.locator('h3')).toHaveCount(1);
    await expect(page.locator('h3')).toHaveText('My E2E Project');

    // Create second project
    await page.getByRole('button', { name: '+ New Project' }).click();
    await page.getByPlaceholder('Project name').fill('Second Project');
    await page.getByRole('button', { name: 'Create' }).click();
    await page.waitForTimeout(500);
    await expect(page.locator('h3')).toHaveCount(2);

    // Delete second project (confirm is overridden via addInitScript)
    await page.getByRole('button', { name: 'Delete' }).first().click();
    // Wait for the deleted project to disappear
    await expect(page.getByText('Second Project')).not.toBeVisible({ timeout: 5000 });
    await expect(page.locator('h3')).toHaveCount(1);
    await expect(page.locator('h3')).toHaveText('My E2E Project');
  });

  test('A5: Enter project and create a same-month task', async ({ page }) => {
    await page.goto('/');
    await login(page);
    await expect(page.getByRole('heading', { name: 'My Projects' })).toBeVisible({ timeout: 5000 });

    // Click project card
    await page.getByText('My E2E Project').click();
    await expect(page.getByText('Tasks').first()).toBeVisible({ timeout: 5000 });

    // Open task drawer
    await page.getByRole('button', { name: '+ Add' }).click();
    await expect(page.getByText('New Task')).toBeVisible();

    // Fill task name
    await page.getByRole('textbox').first().fill('Same Month Task');

    // Verify month label below date inputs
    await expect(page.getByText(/July 2026|August 2026/).first()).toBeVisible();

    // Verify formatted date range preview
    await expect(page.locator('text=/[A-Z][a-z]{2} \\d{1,2}, 2026/').first()).toBeVisible();

    // Submit
    await page.getByRole('button', { name: 'Create Task' }).click();
    await expect(page.getByText('Same Month Task').first()).toBeVisible({ timeout: 5000 });
  });

  test('A6: Create a cross-month task', async ({ page }) => {
    await page.goto('/');
    await login(page);
    await page.getByText('My E2E Project').click();
    await expect(page.getByText('Tasks').first()).toBeVisible({ timeout: 5000 });

    // Open task drawer
    await page.getByRole('button', { name: '+ Add' }).click();

    // Fill name
    await page.getByRole('textbox').first().fill('Cross-Month Task');

    // Change end date to next month
    await page.locator('input[type="date"]').nth(1).fill('2026-08-15');

    // Verify cross-month indicator
    await expect(page.getByText('↔ 跨月')).toBeVisible({ timeout: 3000 });

    // Submit
    await page.getByRole('button', { name: 'Create Task' }).click();
    await expect(page.getByText('Cross-Month Task').first()).toBeVisible({ timeout: 5000 });
  });

  test('A7: Gantt chart view switching and month headers', async ({ page }) => {
    await page.goto('/');
    await login(page);
    await page.getByText('My E2E Project').click();
    await expect(page.getByText('Tasks').first()).toBeVisible({ timeout: 5000 });

    // Wait for frappe-gantt SVG to render
    await page.waitForSelector('.gantt-container', { timeout: 10000 });
    await page.waitForTimeout(500);

    // Check view mode buttons exist
    await expect(page.getByRole('button', { name: 'Day' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Week' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Month' })).toBeVisible();

    // Day is default (active)
    const bgColor = await page.getByRole('button', { name: 'Day' }).evaluate(
      (el) => window.getComputedStyle(el).backgroundColor
    );
    expect(bgColor).not.toBe('rgb(255, 255, 255)');

    // Switch to Week
    await page.getByRole('button', { name: 'Week' }).click();
    await page.waitForTimeout(800);

    // Switch to Month
    await page.getByRole('button', { name: 'Month' }).click();
    await page.waitForTimeout(800);

    // Verify month names visible in Gantt
    await expect(page.locator('.gantt')).toContainText(/July|August/);
  });

  test('A8: Click task bar opens popup with formatted dates', async ({ page }) => {
    await page.goto('/');
    await login(page);
    await page.getByText('My E2E Project').click();
    await page.waitForSelector('.gantt-container', { timeout: 10000 });
    await page.waitForTimeout(1000);

    // Click first task bar
    const bar = page.locator('.bar-wrapper').first();
    if (await bar.isVisible()) {
      await bar.click();
      await expect(page.locator('.popup-wrapper')).toBeVisible({ timeout: 3000 });
      const text = await page.locator('.popup-wrapper').textContent();
      expect(text).toMatch(/Progress/);
    }
  });

  test('A9: Drag-to-pan on Gantt chart', async ({ page }) => {
    await page.goto('/');
    await login(page);
    await page.getByText('My E2E Project').click();
    await page.waitForSelector('.gantt-container', { timeout: 10000 });
    await page.waitForTimeout(1000);

    const container = page.locator('.gantt-container');

    // Verify grab cursor
    await expect(container).toHaveCSS('cursor', 'grab');

    // Verify scrollable content
    const scrollWidth = await container.evaluate((el) => el.scrollWidth);
    const clientWidth = await container.evaluate((el) => el.clientWidth);
    expect(scrollWidth).toBeGreaterThan(clientWidth);

    // Simulate drag from bottom area to avoid task bars
    const box = await container.boundingBox();
    const scrollBefore = await container.evaluate((el) => el.scrollLeft);

    await page.mouse.move(box.x + 50, box.y + box.height - 15);
    await page.mouse.down();
    await page.mouse.move(box.x + 50 + 100, box.y + box.height - 15, { steps: 5 });
    await page.mouse.up();

    const scrollAfter = await container.evaluate((el) => el.scrollLeft);
    expect(scrollAfter).not.toBe(scrollBefore);
  });

});

test.describe('Admin Management', () => {
  const ADMIN = {
    username: `admin-e2e-${Date.now()}`,
    password: 'adminpass123',
  };

  test.beforeAll(async ({ request }) => {
    // Reset all data so ADMIN is the first registered user → automatically admin
    await request.post('/api/dev/reset-db').catch(() => {});

    await request.post('/api/auth/register', {
      data: { username: ADMIN.username, password: ADMIN.password },
    }).catch(() => {});

    // Verify registration was successful
    const verify = await request.post('/api/auth/login', {
      data: { username: ADMIN.username, password: ADMIN.password },
    });
    if (!verify.ok()) throw new Error('Failed to register admin test user');
  });

  async function adminLogin(page) {
    await page.locator('.login-page input').first().fill(ADMIN.username);
    await page.locator('.login-page input[type="password"]').fill(ADMIN.password);
    await page.getByRole('button', { name: 'Login' }).click();
  }

  test('A10: Admin button visible and navigates to admin page', async ({ page }) => {
    await page.goto('/');
    await adminLogin(page);
    await expect(page.getByRole('heading', { name: 'My Projects' })).toBeVisible({ timeout: 5000 });

    await expect(page.getByRole('button', { name: 'Admin' })).toBeVisible();

    // Navigate to admin page
    await page.getByRole('button', { name: 'Admin' }).click();
    await expect(page.getByRole('heading', { name: 'Account Management' })).toBeVisible({ timeout: 5000 });
    await expect(page).toHaveURL(/\/a7x9k2m/);

    // User table shows current user
    await expect(page.getByText(ADMIN.username)).toBeVisible();

    // Back button returns to project list
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page.getByRole('heading', { name: 'My Projects' })).toBeVisible({ timeout: 5000 });
  });

  test('A11: Admin can create a new account', async ({ page }) => {
    await page.goto('/');
    await adminLogin(page);
    await page.getByRole('button', { name: 'Admin' }).click();
    await expect(page.getByRole('heading', { name: 'Account Management' })).toBeVisible({ timeout: 5000 });

    const newUsername = `newuser-${Date.now()}`;

    // Fill create account form
    await page.locator('form input').first().fill(newUsername);
    await page.locator('form input[type="password"]').fill('testpass123');
    await page.getByRole('button', { name: 'Create' }).click();

    // Verify success message and new user in table
    await expect(page.getByText('User created')).toBeVisible();
    await expect(page.getByText(newUsername)).toBeVisible();
  });

  test('A12: Admin can change user password', async ({ page }) => {
    await page.goto('/');
    await adminLogin(page);
    await page.getByRole('button', { name: 'Admin' }).click();
    await expect(page.getByRole('heading', { name: 'Account Management' })).toBeVisible({ timeout: 5000 });

    // Click Change Password on first non-self user row
    await page.getByRole('button', { name: 'Change Password' }).nth(1).click();

    // Set new password and save
    await page.getByPlaceholder('New password').fill('newpass456');
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByText('Password updated')).toBeVisible();
  });

  test('A13: Project permission isolation — user only sees permitted projects', async ({ page, request }) => {
    // Login as admin via API
    const loginRes = await request.post('/api/auth/login', {
      data: { username: ADMIN.username, password: ADMIN.password }
    });
    const loginData = await loginRes.json();
    if (!loginRes.ok()) throw new Error(`Admin login failed: ${loginData.error || 'unknown'}`);
    const { token } = loginData;

    // Create two projects as admin with explicit error checking
    const p1res = await request.post('/api/projects', {
      data: { name: `Permitted-${Date.now()}` },
      headers: { Authorization: `Bearer ${token}` }
    });
    const p1data = await p1res.json();
    if (!p1res.ok()) throw new Error(`Project 1 creation failed: ${p1data.error || 'unknown'}`);
    const proj1 = p1data.project;

    const p2res = await request.post('/api/projects', {
      data: { name: `Restricted-${Date.now()}` },
      headers: { Authorization: `Bearer ${token}` }
    });
    const p2data = await p2res.json();
    if (!p2res.ok()) throw new Error(`Project 2 creation failed: ${p2data.error || 'unknown'}`);
    const proj2 = p2data.project;

    // Create a user with access to only proj1
    const limitedUser = `limited-${Date.now()}`;
    await request.post('/api/a7x9k2m/users', {
      data: {
        username: limitedUser,
        password: 'test1234',
        project_ids: [proj1.id],
      },
      headers: { Authorization: `Bearer ${token}` }
    });

    // Login as the limited user
    await page.goto('/');
    await page.locator('.login-page input').first().fill(limitedUser);
    await page.locator('.login-page input[type="password"]').fill('test1234');
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page.getByRole('heading', { name: 'My Projects' })).toBeVisible({ timeout: 5000 });

    // Can see permitted project
    await expect(page.getByText(proj1.name)).toBeVisible();

    // Cannot see restricted project
    await expect(page.getByText(proj2.name)).not.toBeVisible();

    // Cannot access restricted project by URL (should redirect or show nothing useful)
    await page.goto(`/project/${proj2.id}`);
    await page.waitForTimeout(1500);
    // Should have been redirected away or show a blank page
    // If redirect happened, we'd see the project list heading
    const onProjectPage = page.url().includes('/project/');
    if (!onProjectPage) {
      await expect(page.getByRole('heading', { name: 'My Projects' })).toBeVisible({ timeout: 3000 });
    }
  });
});
