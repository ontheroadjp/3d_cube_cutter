# Rittai Setsudan (Solid Cutting Simulator)

A 3D simulation tool designed to help students preparing for middle school entrance exams understand the concept of "Solid Cutting" (cutting cubes and cuboids) in arithmetic geometry.

## Overview

This application allows users to interactively define cut points on a cuboid and visualize the resulting cross-section and the remaining solid shape in real-time. It is built to enhance spatial reasoning skills required for solving geometry problems.

## Features

*   **Interactive Cutting:** Select 3 points on the edges of a cube/cuboid to cut it.
*   **Real-time Visualization:** Instantly see the cross-section (red surface) and the cut-off part (e.g., triangular pyramid).
*   **Custom Dimensions:** Configure the width, height, and depth of the cuboid.
*   **Measurement Labels:** Toggle vertex labels (A-H) and edge lengths. Supports "Pop-up" mode for checking lengths by hovering over edges.
*   **Transparency Control:** Make the solid transparent to see internal structures.
*   **CSG Implementation:** Accurately models the shape change using Constructive Solid Geometry (three-bvh-csg).

## How to Use

1.  Open `index.html` in a modern web browser.
2.  **Select Points:** Click on any edge of the cube to place a cut point (Points I, J, K).
3.  **Cut:** Once 3 points are selected, the cut is performed automatically.
4.  **Controls:**
    *   **Rotate:** Left-click drag
    *   **Zoom:** Mouse wheel / Pinch
    *   **Pan:** Right-click drag
5.  **Settings Panel:** Use the top-left panel to reset, configure size, or toggle display options.

## Tech Stack

*   JavaScript (ESM)
*   [Three.js](https://threejs.org/)
*   [three-bvh-csg](https://github.com/gkjohnson/three-bvh-csg)

## License

MIT License
