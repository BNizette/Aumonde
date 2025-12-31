#!/usr/bin/env python3

import asyncio
from playwright.async_api import async_playwright

async def test_john_masters_vessel_data():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        try:
            await page.set_viewport_size({"width": 1920, "height": 1080})
            
            print("🔍 Testing John Masters for vessel data in crew shifts")
            
            # Login and navigate
            await page.goto('https://seaflex-1.preview.emergentagent.com')
            await page.wait_for_timeout(2000)
            
            await page.fill('input[type="email"]', 'admin@test.com')
            await page.fill('input[type="password"]', 'Admin123!')
            await page.click('button[type="submit"]')
            await page.wait_for_timeout(3000)
            
            await page.goto('https://seaflex-1.preview.emergentagent.com/crew')
            await page.wait_for_timeout(3000)
            
            await page.wait_for_selector('.divide-y', timeout=10000)
            
            # Find John Masters
            crew_rows = await page.locator('.divide-y > div').count()
            found_john = False
            
            for i in range(crew_rows):
                row = page.locator('.divide-y > div').nth(i)
                crew_name = await row.locator('.font-semibold.text-gray-900').text_content()
                
                if crew_name and "John Masters" in crew_name:
                    print(f"✅ Found John Masters")
                    found_john = True
                    
                    # Click View Logs
                    await row.locator('button[title="View logs"]').click()
                    await page.wait_for_timeout(2000)
                    
                    # Click Crew Shifts tab
                    await page.click('button:has-text("Crew Shifts")')
                    await page.wait_for_timeout(2000)
                    
                    # Check vessel data
                    row_count = await page.locator('tbody tr').count()
                    print(f"John Masters has {row_count} shift records")
                    
                    vessels_found = []
                    
                    for j in range(min(row_count, 10)):  # Check up to 10 rows
                        data_row = page.locator('tbody tr').nth(j)
                        vessel_cell = data_row.locator('td').nth(2)
                        vessel_content = await vessel_cell.text_content()
                        
                        # Check styling
                        purple_badge_count = await vessel_cell.locator('.bg-purple-50').count()
                        has_ship_emoji = vessel_content and '🚢' in vessel_content
                        
                        if vessel_content and vessel_content.strip() != '-':
                            if purple_badge_count > 0 and has_ship_emoji:
                                vessel_name = vessel_content.replace('🚢', '').strip()
                                vessels_found.append(vessel_name)
                                print(f"  Row {j + 1}: ✅ Vessel with proper styling: '{vessel_name}'")
                            else:
                                print(f"  Row {j + 1}: ⚠️ Vessel without proper styling: '{vessel_content.strip()}'")
                        else:
                            print(f"  Row {j + 1}: No vessel ('-')")
                    
                    if vessels_found:
                        print(f"✅ Found vessels with proper styling: {vessels_found}")
                    else:
                        print("ℹ️ No vessels found with proper styling")
                    
                    # Take screenshot
                    await page.screenshot(path='.screenshots/john_masters_crew_shifts.png', full_page=False)
                    print("Screenshot saved: .screenshots/john_masters_crew_shifts.png")
                    
                    break
            
            if not found_john:
                print("❌ John Masters not found")
            
        except Exception as error:
            print(f"❌ Error: {error}")
            await page.screenshot(path='.screenshots/john_masters_error.png', full_page=False)
        
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(test_john_masters_vessel_data())