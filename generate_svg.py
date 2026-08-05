import random
import math
import os

# Define paths for the 40 icons
ICONS = {
    "chat_bubble": "M -8,-6 H 8 A 2,2 0 0 1 10,-4 V 4 A 2,2 0 0 1 8,6 H -2 L -6,10 V 6 H -8 A 2,2 0 0 1 -10,4 V -4 A 2,2 0 0 1 -8,-6 Z",
    "heart": "M 0,8 C -6,3 -10,-2 -10,-6 A 4,4 0 0 1 -2,-10 C 0,-8 0,-8 0,-8 C 0,-8 0,-8 2,-10 A 4,4 0 0 1 10,-6 C 10,-2 6,3 0,8 Z",
    "star": "M 0,-10 L 3,-3 L 10,-2 L 5,3 L 7,10 L 0,6 L -7,10 L -5,3 L -10,-2 L -3,-3 Z",
    "phone": "M -6,-9 H 6 A 2,2 0 0 1 8,-7 V 7 A 2,2 0 0 1 6,9 H -6 A 2,2 0 0 1 -8,7 V -7 A 2,2 0 0 1 -6,-9 Z M -2,6 H 2",
    "sun": "M 0,-4 A 4,4 0 1 1 0,4 A 4,4 0 1 1 0,-4 M 0,-8 V -10 M 0,8 V 10 M -8,0 H -10 M 8,0 H 10",
    "moon": "M -3,-9 A 9,9 0 0 0 6,6 A 7,7 0 1 1 -3,-9 Z",
    "paper_plane": "M -10,-10 L 10,0 L -10,10 L -4,2 L -10,-10 Z M -4,2 L 10,0",
    "coffee": "M -6,-4 H 6 V 4 A 4,4 0 0 1 2,8 H -2 A 4,4 0 0 1 -6,4 Z M 6,-2 H 8 A 2,2 0 0 1 10,0 V 2 A 2,2 0 0 1 8,4 H 6",
    "mail": "M -8,-6 H 8 A 2,2 0 0 1 10,-4 V 4 A 2,2 0 0 1 8,6 H -8 A 2,2 0 0 1 -10,4 V -4 A 2,2 0 0 1 -8,-6 Z M -10,-4 L 0,1 L 10,-4",
    "lock": "M -5,-2 V -5 A 5,5 0 0 1 5,-5 V -2 M -7,-2 H 7 V 8 H -7 Z",
    "pin": "M 0,-8 C 3,-8 5,-6 5,-3 C 5,1 0,8 0,8 C 0,8 -5,1 -5,-3 C -5,-6 -3,-8 0,-8 Z M -2,-3 A 2,2 0 1 1 2,-3",
    "clock": "M 0,-8 A 8,8 0 1 1 0,8 A 8,8 0 1 1 0,-8 Z M 0,0 V -4 M 0,0 H 3",
    "bell": "M -4,5 A 5,5 0 0 0 4,5 M -6,5 H 6 M -2,7 A 2,2 0 0 1 2,7",
    "camera": "M -8,-3 H -5 L -3,-6 H 3 L 5,-3 H 8 A 2,2 0 0 1 10,-1 V 7 A 2,2 0 0 1 8,9 H -8 A 2,2 0 0 1 -10,7 V -1 A 2,2 0 0 1 -8,-3 Z M 0,3 A 3,3 0 1 1 0,3.1",
    "cloud": "M -5,4 C -8,4 -9,1 -7,-1 C -7,-5 -3,-7 0,-5 C 2,-8 7,-6 6,-2 C 8,-2 9,1 7,4 Z",
    "music": "M -4,6 V -6 L 6,-9 V 3 M -4,-2 L 6,-5 M -7,6 A 3,2 0 1 1 -4,4 M 3,3 A 3,2 0 1 1 6,1",
    "calendar": "M -7,-5 H 7 V 7 H -7 Z M -4,-7 V -5 M 4,-7 V -5 M -7,0 H 7",
    "document": "M -6,-8 H 2 L 6,-4 V 8 H -6 Z M 2,-8 V -4 H 6",
    "folder": "M -8,-6 H -3 L -1,-3 H 8 V 6 H -8 Z",
    "rocket": "M 0,-10 C 2,-4 5,0 5,6 L 3,8 L 0,5 L -3,8 L -5,6 C -5,0 -2,-4 0,-10 Z M -3,8 L -6,10 L -5,6 M 3,8 L 6,10 L 5,6",
    "headphones": "M -7,4 V 0 A 7,7 0 0 1 7,0 V 4 M -8,4 H -5 V 7 H -8 Z M 5,4 H 8 V 7 H 5 Z",
    "globe": "M 0,-8 A 8,8 0 1 1 0,8 A 8,8 0 1 1 0,-8 Z M -8,0 H 8 M 0,-8 C 3,-4 3,4 0,8 M 0,-8 C -3,-4 -3,4 0,8",
    "shield": "M -6,-7 H 6 V 0 C 6,4 3,7 0,9 C -3,7 -6,4 -6,0 Z",
    "wifi": "M -8,-4 A 11,11 0 0 1 8,-4 M -5,-1 A 7,7 0 0 1 5,-1 M -2,2 A 3,3 0 0 1 2,2 M 0,5 A 1,1 0 1 1 0,5.1",
    "settings": "M -2,-8 H 2 L -3,-5 M 0,-3 A 3,3 0 1 1 0,3",
    "location": "M 0,-8 C -4,-8 -7,-4 -7,0 C -7,5 0,10 0,10 C 0,10 7,5 7,0 C 7,-4 4,-8 0,-8 Z M 0,-2 A 2,2 0 1 1 0,-1.9",
    "gift": "M -7,-3 H 7 V 7 H -7 Z M -8,-6 H 8 V -3 H -8 Z M 0,-6 C -2,-10 -5,-10 -5,-6 Z M 0,-6 C 2,-10 5,-10 5,-6 Z",
    "user": "M 0,-2 A 4,4 0 1 1 0,-10 A 4,4 0 1 1 0,-2 Z M -8,8 C -8,4 -4,2 0,2 C 4,2 8,4 8,8",
    "group": "M -3,-2 A 3,3 0 1 1 -3,-8 M -9,8 C -9,5 -6,3 -3,3 C 0,3 3,5 3,8 M 4,-2 A 3,3 0 1 1 4,-8 M 1,8 C 1,5 4,3 7,3 C 10,3 10,5 10,8",
    "bookmark": "M -6,-8 H 6 V 8 L 0,3 L -6,8 Z",
    "battery": "M -8,-4 H 6 V 4 H -8 Z M 6,-2 H 8 V 2 H 6 M -5,-2 H -2 V 2 H -5",
    "gamepad": "M -9,-4 H 9 V 4 H -9 Z M -6,0 H -2 M -4,-2 V 2 M 4,0 A 1,1 0 1 1 4,0.1",
    "flower": "M 0,-2 A 2,2 0 1 1 0,2 Z M 0,-2 C 0,-6 4,-6 0,-2 Z M 0,2 C 0,6 -4,6 0,2 Z M -2,0 C -6,0 -6,-4 -2,0 Z M 2,0 C 6,0 6,4 2,0 Z",
    "tree": "M 0,-8 L 6,-2 H 4 L 8,3 H -8 L -4,-2 H -6 Z M 0,3 V 8",
    "fire": "M 0,9 C 4,9 7,6 7,2 C 7,-3 2,-9 0,-10 C -2,-9 -7,-3 -7,2 C -7,6 -4,9 0,9 Z M -3,2 C -3,0 0,-4 0,-4 C 0,-4 3,0 3,2 C 3,4 0,6 -1,6 C -2,6 -3,4 -3,2 Z",
    "book": "M -6,-8 H 6 V 6 H -6 Z M -6,6 C -4,6 -4,8 -6,8 Z M -6,8 H 6 M -2,-5 H 4",
    "microphone": "M -3,-6 V 2 C -3,4 3,4 3,2 V -6 C 3,-8 -3,-8 -3,-6 Z M -6,0 A 6,6 0 0 0 6,0 M 0,6 V 9",
    "emoji": "M 0,-8 A 8,8 0 1 1 0,8 A 8,8 0 1 1 0,-8 Z M -3,-3 A 1,1 0 1 1 -3,-2.9 M 3,-3 A 1,1 0 1 1 3,-2.9 M -4,2 C -2,5 2,5 4,2",
    "video": "M -8,-5 H 2 V 5 H -8 Z M 2,-2 L 7,-5 V 5 L 2,2",
    "headphones_alt": "M -7,4 V 0 A 7,7 0 0 1 7,0 V 4"
}

# Settings
VIEWPORT_SIZE = 420
MIN_DISTANCE = 23 # Prevent overlap
STROKE_WIDTH = 1.4
OPACITY = 0.06

placed_icons = []

# Generate non-overlapping random positions
for i in range(220): # Attempt to place up to 220 icons
    placed = False
    for attempt in range(100): # 100 attempts to place without overlap
        x = random.uniform(20, VIEWPORT_SIZE - 20)
        y = random.uniform(20, VIEWPORT_SIZE - 20)
        
        # Check distance to all placed icons
        too_close = False
        for px, py in placed_icons:
            dist = math.sqrt((x - px)**2 + (y - py)**2)
            if dist < MIN_DISTANCE:
                too_close = True
                break
                
        if not too_close:
            placed_icons.append((x, y))
            placed = True
            break

# Construct SVG
svg_elements = []
svg_elements.append(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {VIEWPORT_SIZE} {VIEWPORT_SIZE}" width="{VIEWPORT_SIZE}" height="{VIEWPORT_SIZE}">')

icon_keys = list(ICONS.keys())

for idx, (x, y) in enumerate(placed_icons):
    icon_name = random.choice(icon_keys)
    path_d = ICONS[icon_name]
    rotate_deg = random.randint(-35, 35)
    
    element = (
        f'  <g transform="translate({x:.1f}, {y:.1f}) rotate({rotate_deg})">\n'
        f'    <path d="{path_d}" stroke="#F5F5F5" stroke-width="{STROKE_WIDTH}" fill="none" opacity="{OPACITY}" stroke-linecap="round" stroke-linejoin="round"/>\n'
        f'  </g>'
    )
    svg_elements.append(element)

svg_elements.append('</svg>')

# Write to file
os.makedirs("static", exist_ok=True)
with open("static/chat-pattern.svg", "w", encoding="utf-8") as f:
    f.write("\n".join(svg_elements))

print(f"Generated chat-pattern.svg with {len(placed_icons)} non-overlapping vector doodle icons!")
