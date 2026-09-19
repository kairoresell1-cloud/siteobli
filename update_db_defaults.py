import re
import os

db_path = r"C:\Users\luigi\Downloads\sito oblivion\sito oblivion\database.js"
with open(db_path, "r", encoding="utf-8") as f:
    content = f.read()

# Add color keys to DEFAULT_CONFIG
color_defaults = """  esp_name_color:'#ffffff', esp_id_color:'#ffffff', esp_distance_color:'#ffffff', esp_weapon_color:'#ffffff',
  esp_box_color:'#ffffff', esp_skeleton_color:'#ffffff', esp_head_color:'#ffffff', esp_healthbar_color:'#00ff00', esp_armorbar_color:'#007fff',
"""

if "esp_name_color" not in content:
    content = content.replace("esp_enable:false,", color_defaults + "  esp_enable:false,")
    
    # Let's also add the aimbot/silent keys that might be missing
    if "aimbot_key" not in content:
        content = content.replace("aimbot_enable:false,", "aimbot_key:0, aimbot_key_mode:0, aimbot_enable:false,")
    if "silent_key" not in content:
        content = content.replace("silent_enable:false,", "silent_key:0, silent_key_mode:0, silent_enable:false,")
    if "triggerbot_key" not in content:
        content = content.replace("triggerbot_enable:false,", "triggerbot_key:0, triggerbot_enable:false,")
    
    with open(db_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("database.js updated")
else:
    print("database.js already updated")
