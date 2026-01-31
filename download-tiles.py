#!/usr/bin/env python3
"""
OpenStreetMap Tile Downloader for EmComm Chat
Downloads map tiles for offline use

Usage:
    python3 download-tiles.py MIN_LAT MIN_LON MAX_LAT MAX_LON MIN_ZOOM MAX_ZOOM

Example (Chicago area):
    python3 download-tiles.py 41.6 -88.0 42.0 -87.5 1 14
"""

import os
import sys
import math
import time
import requests
from pathlib import Path

# Tile server URL (using OpenStreetMap)
TILE_SERVER = "https://tile.openstreetmap.org/{z}/{x}/{y}.png"

# Output directory
OUTPUT_DIR = "./map-tiles"

# Rate limiting (be respectful to tile servers)
DELAY_BETWEEN_REQUESTS = 0.1  # seconds

# User agent (identify yourself to the tile server)
USER_AGENT = "EmComm-Chat-Tile-Downloader/1.0"


def deg2num(lat_deg, lon_deg, zoom):
    """Convert lat/lon to tile numbers"""
    lat_rad = math.radians(lat_deg)
    n = 2.0 ** zoom
    xtile = int((lon_deg + 180.0) / 360.0 * n)
    ytile = int((1.0 - math.asinh(math.tan(lat_rad)) / math.pi) / 2.0 * n)
    return (xtile, ytile)


def download_tile(zoom, x, y, output_dir):
    """Download a single tile"""
    # Create directory structure
    tile_dir = os.path.join(output_dir, str(zoom), str(x))
    os.makedirs(tile_dir, exist_ok=True)
    
    tile_path = os.path.join(tile_dir, f"{y}.png")
    
    # Skip if already downloaded
    if os.path.exists(tile_path):
        return True
    
    # Download tile
    url = TILE_SERVER.format(z=zoom, x=x, y=y)
    headers = {"User-Agent": USER_AGENT}
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code == 200:
            with open(tile_path, 'wb') as f:
                f.write(response.content)
            return True
        else:
            print(f"Failed to download tile {zoom}/{x}/{y}: HTTP {response.status_code}")
            return False
    except Exception as e:
        print(f"Error downloading tile {zoom}/{x}/{y}: {e}")
        return False


def download_tiles(min_lat, min_lon, max_lat, max_lon, min_zoom, max_zoom, output_dir):
    """Download all tiles in the specified bounding box and zoom range"""
    
    total_tiles = 0
    downloaded_tiles = 0
    
    # Calculate total number of tiles
    for zoom in range(min_zoom, max_zoom + 1):
        x1, y1 = deg2num(max_lat, min_lon, zoom)
        x2, y2 = deg2num(min_lat, max_lon, zoom)
        
        # Ensure correct order
        if x1 > x2:
            x1, x2 = x2, x1
        if y1 > y2:
            y1, y2 = y2, y1
        
        total_tiles += (x2 - x1 + 1) * (y2 - y1 + 1)
    
    print(f"Total tiles to download: {total_tiles}")
    print(f"Estimated size: {total_tiles * 15 / 1024:.1f} MB")
    print(f"Estimated time: {total_tiles * DELAY_BETWEEN_REQUESTS / 60:.1f} minutes")
    print()
    
    response = input("Continue? (y/n): ")
    if response.lower() != 'y':
        print("Cancelled")
        return
    
    print("\nDownloading tiles...\n")
    
    # Download tiles
    for zoom in range(min_zoom, max_zoom + 1):
        x1, y1 = deg2num(max_lat, min_lon, zoom)
        x2, y2 = deg2num(min_lat, max_lon, zoom)
        
        # Ensure correct order
        if x1 > x2:
            x1, x2 = x2, x1
        if y1 > y2:
            y1, y2 = y2, y1
        
        zoom_tiles = (x2 - x1 + 1) * (y2 - y1 + 1)
        print(f"Zoom level {zoom}: {zoom_tiles} tiles")
        
        for x in range(x1, x2 + 1):
            for y in range(y1, y2 + 1):
                if download_tile(zoom, x, y, output_dir):
                    downloaded_tiles += 1
                
                # Rate limiting
                time.sleep(DELAY_BETWEEN_REQUESTS)
                
                # Progress indicator
                if downloaded_tiles % 100 == 0:
                    progress = (downloaded_tiles / total_tiles) * 100
                    print(f"Progress: {downloaded_tiles}/{total_tiles} ({progress:.1f}%)")
        
        print(f"Zoom level {zoom} complete\n")
    
    print(f"\nDownload complete!")
    print(f"Downloaded {downloaded_tiles} tiles")
    print(f"Tiles saved to: {output_dir}")


def main():
    if len(sys.argv) != 7:
        print("Usage: python3 download-tiles.py MIN_LAT MIN_LON MAX_LAT MAX_LON MIN_ZOOM MAX_ZOOM")
        print("\nExample (Chicago area):")
        print("  python3 download-tiles.py 41.6 -88.0 42.0 -87.5 1 14")
        print("\nExample (small test area):")
        print("  python3 download-tiles.py 41.85 -87.70 41.90 -87.60 10 12")
        sys.exit(1)
    
    try:
        min_lat = float(sys.argv[1])
        min_lon = float(sys.argv[2])
        max_lat = float(sys.argv[3])
        max_lon = float(sys.argv[4])
        min_zoom = int(sys.argv[5])
        max_zoom = int(sys.argv[6])
    except ValueError:
        print("Error: Invalid coordinates or zoom levels")
        sys.exit(1)
    
    # Validate inputs
    if not (-90 <= min_lat <= 90) or not (-90 <= max_lat <= 90):
        print("Error: Latitude must be between -90 and 90")
        sys.exit(1)
    
    if not (-180 <= min_lon <= 180) or not (-180 <= max_lon <= 180):
        print("Error: Longitude must be between -180 and 180")
        sys.exit(1)
    
    if min_lat >= max_lat:
        print("Error: MIN_LAT must be less than MAX_LAT")
        sys.exit(1)
    
    if min_lon >= max_lon:
        print("Error: MIN_LON must be less than MAX_LON")
        sys.exit(1)
    
    if not (0 <= min_zoom <= max_zoom <= 18):
        print("Error: Zoom levels must be between 0 and 18, and MIN_ZOOM <= MAX_ZOOM")
        sys.exit(1)
    
    print("EmComm Chat - Map Tile Downloader")
    print("=" * 50)
    print(f"Bounding box: ({min_lat}, {min_lon}) to ({max_lat}, {max_lon})")
    print(f"Zoom levels: {min_zoom} to {max_zoom}")
    print(f"Output directory: {OUTPUT_DIR}")
    print()
    
    # Create output directory
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Download tiles
    download_tiles(min_lat, min_lon, max_lat, max_lon, min_zoom, max_zoom, OUTPUT_DIR)


if __name__ == "__main__":
    main()
