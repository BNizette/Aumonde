#!/usr/bin/env python3

import asyncio
from playwright.async_api import async_playwright

async def test_crew_member_logs(page, crew_name_to_find):
    """Test crew logs for a specific crew member"""
    print(f"\n🔍 Testing crew logs for: {crew_name_to_find}")
    
    # Find the crew member row
    crew_rows = await page.locator('.divide-y > div').count()
    found_crew = False
    
    for i in range(crew_rows):
        row = page.locator('.divide-y > div').nth(i)
        crew_name = await row.locator('.font-semibold.text-gray-900').text_content()
        
        if crew_name and crew_name_to_find in crew_name:
            print(f"✅ Found crew member: {crew_name}")
            found_crew = True
            
            # Click View Logs button
            await row.locator('button[title="View logs"]').click()
            await page.wait_for_timeout(2000)
            
            # Verify dialog opened
            dialog_count = await page.locator('[role="dialog"]').count()
            if dialog_count > 0:
                print("✅ Crew logs dialog opened")
                
                # Click Crew Shifts tab
                await page.click('button:has-text("Crew Shifts")')
                await page.wait_for_timeout(1000)
                
                # Check table
                table_count = await page.locator('table').count()
                if table_count > 0:
                    # Get headers
                    headers = await page.locator('thead th').all_text_contents()
                    print(f"Table headers: {headers}")
                    
                    # Check vessel column
                    vessel_index = next((i for i, h in enumerate(headers) if 'Vessel' in h), -1)
                    if vessel_index == 2:
                        print("✅ Vessel column in correct position (3rd)")
                    else:
                        print(f"❌ Vessel column position: {vessel_index + 1}")
                    
                    # Check data rows
                    row_count = await page.locator('tbody tr').count()
                    print(f"Data rows: {row_count}")
                    
                    vessel_with_data = 0
                    vessel_without_data = 0
                    
                    for j in range(min(row_count, 5)):  # Check first 5 rows
                        data_row = page.locator('tbody tr').nth(j)
                        vessel_cell = data_row.locator('td').nth(2)
                        vessel_content = await vessel_cell.text_content()
                        
                        # Check for purple badge and ship emoji
                        purple_badge_count = await vessel_cell.locator('.bg-purple-50').count()
                        has_ship_emoji = vessel_content and '🚢' in vessel_content
                        
                        if vessel_content and vessel_content.strip() == '-':
                            vessel_without_data += 1
                            print(f"  Row {j + 1}: No vessel ('-')")
                        elif purple_badge_count > 0 and has_ship_emoji:
                            vessel_with_data += 1
                            vessel_name = vessel_content.replace('🚢', '').strip()
                            print(f"  Row {j + 1}: ✅ Vessel with styling: '{vessel_name}'")
                        elif vessel_content and vessel_content.strip() != '-':
                            print(f"  Row {j + 1}: ⚠️ Vessel without proper styling: '{vessel_content.strip()}'")
                        else:
                            print(f"  Row {j + 1}: Empty vessel cell")
                    
                    print(f"Summary - With vessel data: {vessel_with_data}, Without vessel data: {vessel_without_data}")
                    
                    # Take screenshot
                    screenshot_name = f'.screenshots/crew_logs_{crew_name.replace(" ", "_").lower()}.png'
                    await page.screenshot(path=screenshot_name, full_page=False)
                    print(f"Screenshot saved: {screenshot_name}")
                
                # Close dialog
                await page.click('button[aria-label="Close"]')
                await page.wait_for_timeout(1000)
                
            break
    
    if not found_crew:
        print(f"❌ Crew member '{crew_name_to_find}' not found")
    
    return found_crew

async def test_crew_logs_comprehensive():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        try:
            await page.set_viewport_size({"width": 1920, "height": 1080})
            
            print("🔍 Starting Comprehensive Crew Logs Vessel Column Testing")
            
            # Login
            await page.goto('https://nautical-ops-2.preview.emergentagent.com')
            await page.wait_for_timeout(2000)
            
            print("Step 1: Logging in")
            await page.fill('input[type="email"]', 'admin@test.com')
            await page.fill('input[type="password"]', 'Admin123!')
            await page.click('button[type="submit"]')
            await page.wait_for_timeout(3000)
            
            # Navigate to crew management
            print("Step 2: Navigating to Crew Management")
            await page.goto('https://nautical-ops-2.preview.emergentagent.com/crew')
            await page.wait_for_timeout(3000)
            
            # Wait for crew list
            await page.wait_for_selector('.divide-y', timeout=10000)
            
            crew_count = await page.locator('.divide-y > div').count()
            print(f"Found {crew_count} crew members")
            
            # Test David Chen (manual shifts, likely no vessel data)
            await test_crew_member_logs(page, "David Chen")
            
            # Test John Masters (trip-based shifts, should have vessel data)
            await test_crew_member_logs(page, "John Masters")
            
            # Test Sarah Thompson (also has trip-based shifts)
            await test_crew_member_logs(page, "Sarah Thompson")
            
            print("\n🎯 Comprehensive Crew Logs Testing Complete")
            
        except Exception as error:
            print(f"❌ Error during testing: {error}")
            await page.screenshot(path='.screenshots/comprehensive_test_error.png', full_page=False)
        
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(test_crew_logs_comprehensive())