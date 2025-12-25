#!/usr/bin/env python3

import asyncio
from playwright.async_api import async_playwright

async def test_crew_logs_vessel_column():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        try:
            await page.set_viewport_size({"width": 1920, "height": 1080})
            
            print("🔍 Starting Crew Logs Vessel Column Testing")
            
            # Step 1: Navigate to login page
            await page.goto('https://vessel-tracker-hub.preview.emergentagent.com')
            await page.wait_for_timeout(2000)
            
            # Step 2: Login
            print("Step 1: Logging in with admin credentials")
            await page.fill('input[type="email"]', 'admin@test.com')
            await page.fill('input[type="password"]', 'Admin123!')
            await page.click('button[type="submit"]')
            await page.wait_for_timeout(3000)
            
            # Step 3: Navigate to crew management
            print("Step 2: Navigating to Crew Management")
            await page.goto('https://vessel-tracker-hub.preview.emergentagent.com/crew')
            await page.wait_for_timeout(3000)
            
            # Step 4: Wait for crew list to load
            print("Step 3: Waiting for crew list to load")
            await page.wait_for_selector('.divide-y', timeout=10000)
            
            # Step 5: Find David Chen or first crew member
            print("Step 4: Looking for crew members")
            crew_rows = await page.locator('.divide-y > div').count()
            print(f"Found {crew_rows} crew members")
            
            if crew_rows > 0:
                # Click on first crew member's view logs button
                first_row = page.locator('.divide-y > div').first
                crew_name = await first_row.locator('.font-semibold.text-gray-900').text_content()
                print(f"Testing with crew member: {crew_name}")
                
                # Step 6: Click View Logs button
                print("Step 5: Clicking View Logs button")
                await first_row.locator('button[title="View logs"]').click()
                await page.wait_for_timeout(2000)
                
                # Step 7: Verify dialog opened
                dialog_count = await page.locator('[role="dialog"]').count()
                if dialog_count > 0:
                    print("✅ Crew logs dialog opened successfully")
                    
                    # Step 8: Click on Crew Shifts tab
                    print("Step 6: Clicking on Crew Shifts tab")
                    await page.click('button:has-text("Crew Shifts")')
                    await page.wait_for_timeout(1000)
                    
                    # Step 9: Check table structure
                    print("Step 7: Verifying table structure and Vessel column")
                    table_count = await page.locator('table').count()
                    
                    if table_count > 0:
                        print("✅ Table found in Crew Shifts section")
                        
                        # Get table headers
                        headers = await page.locator('thead th').all_text_contents()
                        print(f"Table headers: {headers}")
                        
                        # Check for Vessel column
                        vessel_column_exists = any('Vessel' in header for header in headers)
                        if vessel_column_exists:
                            print("✅ Vessel column found in table headers")
                            
                            # Check vessel column position (should be 3rd column)
                            vessel_index = next((i for i, h in enumerate(headers) if 'Vessel' in h), -1)
                            if vessel_index == 2:  # 0-indexed, so 2 = 3rd position
                                print("✅ Vessel column is in correct position (3rd column)")
                            else:
                                print(f"❌ Vessel column position incorrect. Expected: 3rd (index 2), Found: {vessel_index + 1}th (index {vessel_index})")
                        else:
                            print("❌ Vessel column not found in table headers")
                        
                        # Step 10: Check data rows
                        print("Step 8: Checking vessel data in table rows")
                        row_count = await page.locator('tbody tr').count()
                        print(f"Found {row_count} data rows")
                        
                        if row_count > 0:
                            # Check first few rows for vessel data
                            for i in range(min(row_count, 3)):
                                row = page.locator('tbody tr').nth(i)
                                vessel_cell = row.locator('td').nth(2)  # 3rd column (0-indexed)
                                vessel_content = await vessel_cell.text_content()
                                
                                print(f"Row {i + 1} vessel content: '{vessel_content.strip() if vessel_content else 'None'}'")
                                
                                # Check for purple badge styling
                                purple_badge_count = await vessel_cell.locator('.bg-purple-50').count()
                                has_ship_emoji = vessel_content and '🚢' in vessel_content
                                
                                if vessel_content and vessel_content.strip() == '-':
                                    print(f"✅ Row {i + 1}: Correctly shows '-' for shifts without vessel")
                                elif purple_badge_count > 0 and has_ship_emoji:
                                    print(f"✅ Row {i + 1}: Vessel has purple badge styling and ship emoji")
                                elif vessel_content and vessel_content.strip() != '-':
                                    print(f"⚠️ Row {i + 1}: Vessel present but missing expected styling - Badge: {purple_badge_count > 0}, Emoji: {has_ship_emoji}")
                        else:
                            print("ℹ️ No crew shift data found for this crew member")
                        
                        # Step 11: Take screenshot
                        print("Step 9: Taking screenshot of crew shifts table")
                        await page.screenshot(
                            path='.screenshots/crew_shifts_vessel_column_test.png',
                            full_page=False
                        )
                        
                    else:
                        print("❌ No table found in Crew Shifts section")
                else:
                    print("❌ Crew logs dialog did not open")
            else:
                print("❌ No crew members found")
            
            print("🎯 Crew Logs Vessel Column Testing Complete")
            
        except Exception as error:
            print(f"❌ Error during testing: {error}")
            await page.screenshot(
                path='.screenshots/crew_logs_error_test.png',
                full_page=False
            )
        
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(test_crew_logs_vessel_column())