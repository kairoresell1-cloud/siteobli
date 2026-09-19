import re

file_path = r"C:\Users\luigi\Downloads\sito oblivion\sito oblivion\public\configs.html"

with open(file_path, "r", encoding="utf-8") as f:
    html = f.read()

# Trova la parte da sostituire
start_marker = "<!-- Main Tabs -->"
end_marker = "<!-- Save Bar -->"

start_idx = html.find(start_marker)
end_idx = html.find(end_marker)

new_content = """<!-- Main Tabs -->
        <div class="config-tabs">
          <button class="config-tab active" onclick="switchTab('aimbot', this)">🎯 Aimbot</button>
          <button class="config-tab" onclick="switchTab('visuals', this)">👁️ Visuals</button>
          <button class="config-tab" onclick="switchTab('settings', this)">⚙️ Settings</button>
        </div>

        <!-- AIMBOT PANEL -->
        <div class="config-panel active" id="panel-aimbot">
          <div class="sub-tabs">
            <button class="sub-tab active" onclick="switchSub('aimbot','silent',this)">Silent</button>
            <button class="sub-tab" onclick="switchSub('aimbot','aimbot',this)">Aimbot</button>
            <button class="sub-tab" onclick="switchSub('aimbot','trigger',this)">Triggerbot</button>
          </div>

          <!-- Silent Aim -->
          <div class="sub-panel active" id="sub-aimbot-silent">
            <div class="cfg-section">
              <div class="cfg-section-title">Silent Aim — General</div>
              <div class="cfg-grid">
                <div class="cfg-row"><span class="cfg-label">Enable Silent</span><label class="toggle"><input type="checkbox" data-key="silent_enable" onchange="markDirty()"><span class="toggle-track"></span></label></div>
                <div class="cfg-row"><span class="cfg-label">Silent Key</span><div class="slider-wrap"><input type="number" data-key="silent_key" onchange="markDirty()" style="width:50px;background:var(--bg-2);border:1px solid var(--border);color:white;border-radius:4px;padding:2px 5px;" placeholder="Key Code"></div></div>
                <div class="cfg-row"><span class="cfg-label">Key Mode</span><select class="cfg-select" data-key="silent_key_mode" onchange="markDirty()"><option value="0">Hold</option><option value="1">Toggle</option></select></div>
                <div class="cfg-row"><span class="cfg-label">Show Silent FOV</span><label class="toggle"><input type="checkbox" data-key="silent_show_fov" onchange="markDirty()"><span class="toggle-track"></span></label></div>
                <div class="cfg-row"><span class="cfg-label">Dynamic FOV</span><label class="toggle"><input type="checkbox" data-key="silent_dynamic_fov" onchange="markDirty()"><span class="toggle-track"></span></label></div>
                <div class="cfg-row"><span class="cfg-label">Ignore Dead</span><label class="toggle"><input type="checkbox" data-key="silent_ignore_dead" onchange="markDirty()"><span class="toggle-track"></span></label></div>
                <div class="cfg-row"><span class="cfg-label">Ignore Invisible</span><label class="toggle"><input type="checkbox" data-key="silent_ignore_invisible" onchange="markDirty()"><span class="toggle-track"></span></label></div>
                <div class="cfg-row"><span class="cfg-label">Ignore Friends</span><label class="toggle"><input type="checkbox" data-key="silent_ignore_friends" onchange="markDirty()"><span class="toggle-track"></span></label></div>
              </div>
            </div>
            <div class="cfg-section">
              <div class="cfg-section-title">Silent Aim — Values</div>
              <div class="cfg-grid">
                <div class="cfg-row"><span class="cfg-label">Distance</span><div class="slider-wrap"><input type="range" min="0" max="1000" data-key="silent_distance" oninput="sliderUpdate(this)" onchange="markDirty()"><span class="slider-val">200</span></div></div>
                <div class="cfg-row"><span class="cfg-label">FOV</span><div class="slider-wrap"><input type="range" min="0" max="300" data-key="silent_fov" oninput="sliderUpdate(this)" onchange="markDirty()"><span class="slider-val">70</span></div></div>
                <div class="cfg-row"><span class="cfg-label">Miss Chance %</span><div class="slider-wrap"><input type="range" min="0" max="100" step="0.5" data-key="silent_miss_chance" oninput="sliderUpdate(this)" onchange="markDirty()"><span class="slider-val">0.0</span></div></div>
                <div class="cfg-row"><span class="cfg-label">Thread Delay (ms)</span><div class="slider-wrap"><input type="range" min="0" max="1000" data-key="silent_thread_delay" oninput="sliderUpdate(this)" onchange="markDirty()"><span class="slider-val">100</span></div></div>
              </div>
            </div>
            <div class="cfg-section">
              <div class="cfg-section-title">Silent Aim — Bone Selection</div>
              <div class="cfg-grid">
                <div class="cfg-row"><span class="cfg-label">Head</span><label class="toggle"><input type="checkbox" data-key="silent_bone_head" onchange="markDirty()"><span class="toggle-track"></span></label></div>
                <div class="cfg-row"><span class="cfg-label">Neck</span><label class="toggle"><input type="checkbox" data-key="silent_bone_neck" onchange="markDirty()"><span class="toggle-track"></span></label></div>
                <div class="cfg-row"><span class="cfg-label">Chest</span><label class="toggle"><input type="checkbox" data-key="silent_bone_chest" onchange="markDirty()"><span class="toggle-track"></span></label></div>
                <div class="cfg-row"><span class="cfg-label">Left Foot</span><label class="toggle"><input type="checkbox" data-key="silent_bone_leftfoot" onchange="markDirty()"><span class="toggle-track"></span></label></div>
                <div class="cfg-row"><span class="cfg-label">Right Foot</span><label class="toggle"><input type="checkbox" data-key="silent_bone_rightfoot" onchange="markDirty()"><span class="toggle-track"></span></label></div>
                <div class="cfg-row"><span class="cfg-label">Left Hand</span><label class="toggle"><input type="checkbox" data-key="silent_bone_lefthand" onchange="markDirty()"><span class="toggle-track"></span></label></div>
                <div class="cfg-row"><span class="cfg-label">Right Hand</span><label class="toggle"><input type="checkbox" data-key="silent_bone_righthand" onchange="markDirty()"><span class="toggle-track"></span></label></div>
              </div>
            </div>
          </div>

          <!-- Aimbot -->
          <div class="sub-panel" id="sub-aimbot-aimbot">
            <div class="cfg-section">
              <div class="cfg-section-title">Aimbot — General</div>
              <div class="cfg-grid">
                <div class="cfg-row"><span class="cfg-label">Enable Aimbot</span><label class="toggle"><input type="checkbox" data-key="aimbot_enable" onchange="markDirty()"><span class="toggle-track"></span></label></div>
                <div class="cfg-row"><span class="cfg-label">Aimbot Key</span><div class="slider-wrap"><input type="number" data-key="aimbot_key" onchange="markDirty()" style="width:50px;background:var(--bg-2);border:1px solid var(--border);color:white;border-radius:4px;padding:2px 5px;" placeholder="Key Code"></div></div>
                <div class="cfg-row"><span class="cfg-label">Key Mode</span><select class="cfg-select" data-key="aimbot_key_mode" onchange="markDirty()"><option value="0">Hold</option><option value="1">Toggle</option></select></div>
                <div class="cfg-row"><span class="cfg-label">Show Aimbot FOV</span><label class="toggle"><input type="checkbox" data-key="aimbot_show_fov" onchange="markDirty()"><span class="toggle-track"></span></label></div>
                <div class="cfg-row"><span class="cfg-label">Ignore Dead</span><label class="toggle"><input type="checkbox" data-key="aimbot_ignore_dead" onchange="markDirty()"><span class="toggle-track"></span></label></div>
                <div class="cfg-row"><span class="cfg-label">Ignore Invisible</span><label class="toggle"><input type="checkbox" data-key="aimbot_ignore_invisible" onchange="markDirty()"><span class="toggle-track"></span></label></div>
                <div class="cfg-row"><span class="cfg-label">Ignore Friends</span><label class="toggle"><input type="checkbox" data-key="aimbot_ignore_friends" onchange="markDirty()"><span class="toggle-track"></span></label></div>
              </div>
            </div>
            <div class="cfg-section">
              <div class="cfg-section-title">Aimbot — Values</div>
              <div class="cfg-grid">
                <div class="cfg-row"><span class="cfg-label">Distance</span><div class="slider-wrap"><input type="range" min="0" max="1000" data-key="aimbot_distance" oninput="sliderUpdate(this)" onchange="markDirty()"><span class="slider-val">200</span></div></div>
                <div class="cfg-row"><span class="cfg-label">FOV</span><div class="slider-wrap"><input type="range" min="0" max="180" data-key="aimbot_fov" oninput="sliderUpdate(this)" onchange="markDirty()"><span class="slider-val">5</span></div></div>
                <div class="cfg-row"><span class="cfg-label">Smoothness</span><div class="slider-wrap"><input type="range" min="0" max="100" data-key="aimbot_smoothness" oninput="sliderUpdate(this)" onchange="markDirty()"><span class="slider-val">10</span></div></div>
                <div class="cfg-row"><span class="cfg-label">Thread Delay (ms)</span><div class="slider-wrap"><input type="range" min="0" max="10" data-key="aimbot_thread_delay" oninput="sliderUpdate(this)" onchange="markDirty()"><span class="slider-val">1</span></div></div>
              </div>
            </div>
            <div class="cfg-section">
              <div class="cfg-section-title">Aimbot — Bone Selection</div>
              <div class="cfg-grid">
                <div class="cfg-row"><span class="cfg-label">Head</span><label class="toggle"><input type="checkbox" data-key="aimbot_bone_head" onchange="markDirty()"><span class="toggle-track"></span></label></div>
                <div class="cfg-row"><span class="cfg-label">Neck</span><label class="toggle"><input type="checkbox" data-key="aimbot_bone_neck" onchange="markDirty()"><span class="toggle-track"></span></label></div>
                <div class="cfg-row"><span class="cfg-label">Chest</span><label class="toggle"><input type="checkbox" data-key="aimbot_bone_chest" onchange="markDirty()"><span class="toggle-track"></span></label></div>
                <div class="cfg-row"><span class="cfg-label">Left Foot</span><label class="toggle"><input type="checkbox" data-key="aimbot_bone_leftfoot" onchange="markDirty()"><span class="toggle-track"></span></label></div>
                <div class="cfg-row"><span class="cfg-label">Right Foot</span><label class="toggle"><input type="checkbox" data-key="aimbot_bone_rightfoot" onchange="markDirty()"><span class="toggle-track"></span></label></div>
                <div class="cfg-row"><span class="cfg-label">Left Hand</span><label class="toggle"><input type="checkbox" data-key="aimbot_bone_lefthand" onchange="markDirty()"><span class="toggle-track"></span></label></div>
                <div class="cfg-row"><span class="cfg-label">Right Hand</span><label class="toggle"><input type="checkbox" data-key="aimbot_bone_righthand" onchange="markDirty()"><span class="toggle-track"></span></label></div>
              </div>
            </div>
          </div>

          <!-- Triggerbot -->
          <div class="sub-panel" id="sub-aimbot-trigger">
            <div class="cfg-section">
              <div class="cfg-section-title">Triggerbot — General</div>
              <div class="cfg-grid">
                <div class="cfg-row"><span class="cfg-label">Enable Triggerbot</span><label class="toggle"><input type="checkbox" data-key="triggerbot_enable" onchange="markDirty()"><span class="toggle-track"></span></label></div>
                <div class="cfg-row"><span class="cfg-label">Triggerbot Key</span><div class="slider-wrap"><input type="number" data-key="triggerbot_key" onchange="markDirty()" style="width:50px;background:var(--bg-2);border:1px solid var(--border);color:white;border-radius:4px;padding:2px 5px;" placeholder="Key Code"></div></div>
                <div class="cfg-row"><span class="cfg-label">Show Triggerbot FOV</span><label class="toggle"><input type="checkbox" data-key="triggerbot_show_fov" onchange="markDirty()"><span class="toggle-track"></span></label></div>
                <div class="cfg-row"><span class="cfg-label">Only Visible</span><label class="toggle"><input type="checkbox" data-key="triggerbot_only_visible" onchange="markDirty()"><span class="toggle-track"></span></label></div>
                <div class="cfg-row"><span class="cfg-label">Ignore Dead</span><label class="toggle"><input type="checkbox" data-key="triggerbot_ignore_dead" onchange="markDirty()"><span class="toggle-track"></span></label></div>
                <div class="cfg-row"><span class="cfg-label">Ignore Invisible</span><label class="toggle"><input type="checkbox" data-key="triggerbot_ignore_invisible" onchange="markDirty()"><span class="toggle-track"></span></label></div>
                <div class="cfg-row"><span class="cfg-label">Ignore NPC</span><label class="toggle"><input type="checkbox" data-key="triggerbot_ignore_npc" onchange="markDirty()"><span class="toggle-track"></span></label></div>
              </div>
            </div>
            <div class="cfg-section">
              <div class="cfg-section-title">Triggerbot — Values</div>
              <div class="cfg-grid">
                <div class="cfg-row"><span class="cfg-label">Distance</span><div class="slider-wrap"><input type="range" min="0" max="1000" data-key="triggerbot_distance" oninput="sliderUpdate(this)" onchange="markDirty()"><span class="slider-val">200</span></div></div>
                <div class="cfg-row"><span class="cfg-label">Delay (ms)</span><div class="slider-wrap"><input type="range" min="0" max="500" data-key="triggerbot_delay" oninput="sliderUpdate(this)" onchange="markDirty()"><span class="slider-val">50</span></div></div>
                <div class="cfg-row"><span class="cfg-label">Crosshair Tolerance</span><div class="slider-wrap"><input type="range" min="1" max="50" step="0.5" data-key="triggerbot_crosshair_tolerance" oninput="sliderUpdate(this)" onchange="markDirty()"><span class="slider-val">15.0</span></div></div>
                <div class="cfg-row"><span class="cfg-label">Thread Delay (ms)</span><div class="slider-wrap"><input type="range" min="0" max="100" data-key="triggerbot_thread_delay" oninput="sliderUpdate(this)" onchange="markDirty()"><span class="slider-val">5</span></div></div>
              </div>
            </div>
            <div class="cfg-section">
              <div class="cfg-section-title">Triggerbot — Bone Selection</div>
              <div class="cfg-grid">
                <div class="cfg-row"><span class="cfg-label">Head</span><label class="toggle"><input type="checkbox" data-key="triggerbot_bone_head" onchange="markDirty()"><span class="toggle-track"></span></label></div>
                <div class="cfg-row"><span class="cfg-label">Neck</span><label class="toggle"><input type="checkbox" data-key="triggerbot_bone_neck" onchange="markDirty()"><span class="toggle-track"></span></label></div>
                <div class="cfg-row"><span class="cfg-label">Chest</span><label class="toggle"><input type="checkbox" data-key="triggerbot_bone_chest" onchange="markDirty()"><span class="toggle-track"></span></label></div>
                <div class="cfg-row"><span class="cfg-label">Left Foot</span><label class="toggle"><input type="checkbox" data-key="triggerbot_bone_leftfoot" onchange="markDirty()"><span class="toggle-track"></span></label></div>
                <div class="cfg-row"><span class="cfg-label">Right Foot</span><label class="toggle"><input type="checkbox" data-key="triggerbot_bone_rightfoot" onchange="markDirty()"><span class="toggle-track"></span></label></div>
                <div class="cfg-row"><span class="cfg-label">Left Hand</span><label class="toggle"><input type="checkbox" data-key="triggerbot_bone_lefthand" onchange="markDirty()"><span class="toggle-track"></span></label></div>
                <div class="cfg-row"><span class="cfg-label">Right Hand</span><label class="toggle"><input type="checkbox" data-key="triggerbot_bone_righthand" onchange="markDirty()"><span class="toggle-track"></span></label></div>
              </div>
            </div>
          </div>
        </div>

        <!-- VISUALS PANEL -->
        <div class="config-panel" id="panel-visuals">
          <div class="sub-tabs">
            <button class="sub-tab active" onclick="switchSub('visuals','esp',this)">ESP</button>
          </div>

          <!-- ESP -->
          <div class="sub-panel active" id="sub-visuals-esp">
            <div class="cfg-section">
              <div class="cfg-section-title">ESP — General</div>
              <div class="cfg-grid">
                <div class="cfg-row"><span class="cfg-label">Enable ESP</span><label class="toggle"><input type="checkbox" data-key="esp_enable" onchange="markDirty()"><span class="toggle-track"></span></label></div>
                <div class="cfg-row"><span class="cfg-label">Show Local Player</span><label class="toggle"><input type="checkbox" data-key="esp_show_local_player" onchange="markDirty()"><span class="toggle-track"></span></label></div>
                <div class="cfg-row"><span class="cfg-label">Ignore Dead</span><label class="toggle"><input type="checkbox" data-key="esp_ignore_dead" onchange="markDirty()"><span class="toggle-track"></span></label></div>
                <div class="cfg-row"><span class="cfg-label">Ignore NPC</span><label class="toggle"><input type="checkbox" data-key="esp_ignore_npc" onchange="markDirty()"><span class="toggle-track"></span></label></div>
                <div class="cfg-row"><span class="cfg-label">Distance</span><div class="slider-wrap"><input type="range" min="0" max="1000" data-key="esp_distance" oninput="sliderUpdate(this)" onchange="markDirty()"><span class="slider-val">200</span></div></div>
              </div>
            </div>
            <div class="cfg-section">
              <div class="cfg-section-title">ESP — Elements</div>
              <div class="cfg-grid">
                <div class="cfg-row"><span class="cfg-label">Name ESP</span><div style="display:flex;gap:10px;align-items:center;"><input type="color" data-key="esp_name_color" onchange="markDirty()"><label class="toggle"><input type="checkbox" data-key="esp_name_enable" onchange="markDirty()"><span class="toggle-track"></span></label></div></div>
                <div class="cfg-row"><span class="cfg-label">ID ESP</span><div style="display:flex;gap:10px;align-items:center;"><input type="color" data-key="esp_id_color" onchange="markDirty()"><label class="toggle"><input type="checkbox" data-key="esp_id_enable" onchange="markDirty()"><span class="toggle-track"></span></label></div></div>
                <div class="cfg-row"><span class="cfg-label">Distance ESP</span><div style="display:flex;gap:10px;align-items:center;"><input type="color" data-key="esp_distance_color" onchange="markDirty()"><label class="toggle"><input type="checkbox" data-key="esp_distance_enable" onchange="markDirty()"><span class="toggle-track"></span></label></div></div>
                <div class="cfg-row"><span class="cfg-label">Weapon ESP</span><div style="display:flex;gap:10px;align-items:center;"><input type="color" data-key="esp_weapon_color" onchange="markDirty()"><label class="toggle"><input type="checkbox" data-key="esp_weapon_enable" onchange="markDirty()"><span class="toggle-track"></span></label></div></div>
              </div>
            </div>
            <div class="cfg-section">
              <div class="cfg-section-title">Box ESP</div>
              <div class="cfg-grid">
                <div class="cfg-row"><span class="cfg-label">Enable Box</span><div style="display:flex;gap:10px;align-items:center;"><input type="color" data-key="esp_box_color" onchange="markDirty()"><label class="toggle"><input type="checkbox" data-key="esp_box_enable" onchange="markDirty()"><span class="toggle-track"></span></label></div></div>
                <div class="cfg-row"><span class="cfg-label">Box Type</span><select class="cfg-select" data-key="esp_box_type" onchange="markDirty()"><option value="0">Full Box</option><option value="1">Corner Box</option></select></div>
                <div class="cfg-row"><span class="cfg-label">Line Type</span><select class="cfg-select" data-key="esp_box_line_type" onchange="markDirty()"><option value="0">Dashed</option><option value="1">Solid</option></select></div>
                <div class="cfg-row"><span class="cfg-label">Line Thickness</span><div class="slider-wrap"><input type="range" min="0.1" max="5" step="0.1" data-key="esp_box_line_thickness" oninput="sliderUpdate(this)" onchange="markDirty()"><span class="slider-val">1.0</span></div></div>
              </div>
            </div>
            <div class="cfg-section">
              <div class="cfg-section-title">Skeleton & Head</div>
              <div class="cfg-grid">
                <div class="cfg-row"><span class="cfg-label">Enable Skeleton</span><div style="display:flex;gap:10px;align-items:center;"><input type="color" data-key="esp_skeleton_color" onchange="markDirty()"><label class="toggle"><input type="checkbox" data-key="esp_skeleton_enable" onchange="markDirty()"><span class="toggle-track"></span></label></div></div>
                <div class="cfg-row"><span class="cfg-label">Skeleton Thickness</span><div class="slider-wrap"><input type="range" min="0.1" max="5" step="0.1" data-key="esp_skeleton_line_thickness" oninput="sliderUpdate(this)" onchange="markDirty()"><span class="slider-val">1.0</span></div></div>
                <div class="cfg-row"><span class="cfg-label">Enable Head Circle</span><div style="display:flex;gap:10px;align-items:center;"><input type="color" data-key="esp_head_color" onchange="markDirty()"><label class="toggle"><input type="checkbox" data-key="esp_head_enable" onchange="markDirty()"><span class="toggle-track"></span></label></div></div>
                <div class="cfg-row"><span class="cfg-label">Head Size</span><div class="slider-wrap"><input type="range" min="5" max="25" step="0.5" data-key="esp_head_size" oninput="sliderUpdate(this)" onchange="markDirty()"><span class="slider-val">15.0</span></div></div>
                <div class="cfg-row"><span class="cfg-label">Head Line Thickness</span><div class="slider-wrap"><input type="range" min="0.1" max="5" step="0.1" data-key="esp_head_line_thickness" oninput="sliderUpdate(this)" onchange="markDirty()"><span class="slider-val">1.0</span></div></div>
              </div>
            </div>
            <div class="cfg-section">
              <div class="cfg-section-title">Health & Armor Bars</div>
              <div class="cfg-grid">
                <div class="cfg-row"><span class="cfg-label">Health Bar</span><div style="display:flex;gap:10px;align-items:center;"><input type="color" data-key="esp_healthbar_color" onchange="markDirty()"><label class="toggle"><input type="checkbox" data-key="esp_healthbar_enable" onchange="markDirty()"><span class="toggle-track"></span></label></div></div>
                <div class="cfg-row"><span class="cfg-label">HP Bar Placement</span><select class="cfg-select" data-key="esp_healthbar_placement" onchange="markDirty()"><option value="0">Bottom</option><option value="1">Top</option><option value="2">Left</option><option value="3">Right</option></select></div>
                <div class="cfg-row"><span class="cfg-label">Armor Bar</span><div style="display:flex;gap:10px;align-items:center;"><input type="color" data-key="esp_armorbar_color" onchange="markDirty()"><label class="toggle"><input type="checkbox" data-key="esp_armorbar_enable" onchange="markDirty()"><span class="toggle-track"></span></label></div></div>
                <div class="cfg-row"><span class="cfg-label">Armor Bar Placement</span><select class="cfg-select" data-key="esp_armorbar_placement" onchange="markDirty()"><option value="0">Bottom</option><option value="1">Top</option><option value="2">Left</option><option value="3">Right</option></select></div>
              </div>
            </div>
          </div>
        </div>

        <!-- SETTINGS PANEL -->
        <div class="config-panel" id="panel-settings">
          <div class="cfg-section">
            <div class="cfg-section-title">General Settings</div>
            <div class="cfg-grid">
              <div class="cfg-row"><span class="cfg-label">Streamproof</span><label class="toggle"><input type="checkbox" data-key="streamproof" onchange="markDirty()"><span class="toggle-track"></span></label></div>
              <div class="cfg-row"><span class="cfg-label">Monitor</span><select class="cfg-select" data-key="monitor" onchange="markDirty()"><option value="1">Monitor 1</option><option value="2">Monitor 2</option></select></div>
              <div class="cfg-row" style="justify-content:center;background:rgba(239,68,68,0.1);border-color:rgba(239,68,68,0.3);"><button class="btn btn-primary" onclick="markDirty(); /* Unhook logic */" style="background:#ef4444;border:none;">Safe Unhook (Exit)</button></div>
              <div class="cfg-row" style="justify-content:center;background:rgba(239,68,68,0.1);border-color:rgba(239,68,68,0.3);"><button class="btn btn-primary" onclick="markDirty(); /* Destruct logic */" style="background:#7f1d1d;border:none;">Destruct</button></div>
            </div>
          </div>
        </div>

        <div style="height:5rem;"></div><!-- spacer for save bar -->
      </div>

      """

new_html = html[:start_idx] + new_content + html[end_idx:]

# also we need to update collectConfig to support input[type=color]
color_script_update = """      document.querySelectorAll('[data-key]').forEach(el => {
        const k = el.dataset.key;
        if (el.type === 'checkbox') {
          out[k] = el.checked;
        } else if (el.tagName === 'SELECT') {
          out[k] = parseInt(el.value, 10);
        } else if (el.type === 'range') {
          out[k] = parseFloat(el.value);
        } else if (el.type === 'color') {
          out[k] = el.value;
        } else if (el.type === 'number') {
          out[k] = parseInt(el.value, 10);
        }
      });"""

old_script_update = """      document.querySelectorAll('[data-key]').forEach(el => {
        const k = el.dataset.key;
        if (el.type === 'checkbox') {
          out[k] = el.checked;
        } else if (el.tagName === 'SELECT') {
          out[k] = parseInt(el.value, 10);
        } else if (el.type === 'range') {
          out[k] = parseFloat(el.value);
        }
      });"""

new_html = new_html.replace(old_script_update, color_script_update)

# update populate logic to set color inputs
old_populate = """        if (el.type === 'checkbox') {
          el.checked = !!cfg[k];
        } else if (el.tagName === 'SELECT') {
          el.value = cfg[k];
        } else if (el.type === 'range') {
          el.value = cfg[k];
          sliderUpdate(el);
        }"""
        
new_populate = """        if (el.type === 'checkbox') {
          el.checked = !!cfg[k];
        } else if (el.tagName === 'SELECT') {
          el.value = cfg[k];
        } else if (el.type === 'range') {
          el.value = cfg[k];
          sliderUpdate(el);
        } else if (el.type === 'color') {
          el.value = cfg[k] || '#ffffff';
        } else if (el.type === 'number') {
          el.value = cfg[k] || 0;
        }"""

new_html = new_html.replace(old_populate, new_populate)


with open(file_path, "w", encoding="utf-8") as f:
    f.write(new_html)
    
print("configs.html completely rewritten based on user request!")
