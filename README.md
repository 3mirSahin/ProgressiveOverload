# Progressive Overload Tracker

A web-based workout tracking application that supports both IndexedDB (browser storage) and SQLite (local file) databases.

## Features

- **Dual Database Support**: Choose between IndexedDB for browser-based storage or SQLite for local file storage
- **Workout Tracking**: Record sets with exercise type, weight, and reps
- **Exercise Management**: Add custom exercises to your workout library
- **History Management**: View, edit, and delete workout history
- **Data Export/Import**: Save and load SQLite database files
- **Responsive Design**: Clean, modern interface that works on desktop and mobile

## Database Options

### IndexedDB (Browser Storage)
- **Pros**: 
  - No file management required
  - Data persists in browser
  - Fast access
  - No external dependencies
- **Cons**: 
  - Data tied to specific browser
  - Limited backup options
  - Cannot easily share between devices

### SQLite (Local File)
- **Pros**: 
  - Portable database files
  - Easy backup and sharing
  - Can be opened with other SQLite tools
  - Cross-device compatibility
- **Cons**: 
  - Requires manual file management
  - Slightly more complex setup

## Usage

### Getting Started

1. Open `index.html` in a modern web browser
2. Choose your preferred database type from the dropdown
3. Start tracking your workouts!

### Using IndexedDB

1. Select "IndexedDB (Browser Storage)" from the database type dropdown
2. Your data will be automatically stored in your browser
3. No additional setup required

### Using SQLite

1. Select "SQLite (Local File)" from the database type dropdown
2. Choose one of the following options:
   - **Create New Database**: Starts with a fresh database
   - **Load Existing Database**: Click "Choose File" to load a previously saved `.db` file
3. **Save Database**: Click "Save Database" to download your current database as a `.db` file

### Adding Workouts

1. Select an exercise from the dropdown (or add a new one)
2. Enter the weight in kilograms
3. Enter the number of reps
4. Click "Submit" to save the set

### Managing Exercises

1. Enter a new exercise name in the "Add a new exercise" section
2. Click "Submit" to add it to your exercise library
3. The new exercise will appear in the dropdown for future workouts

### Managing History

- **View**: All your workout history is displayed in a table
- **Edit**: Click "Update" to modify any workout entry
- **Delete**: Click "Delete" to remove a workout entry

## Technical Details

### Database Schema

Both databases use the same schema:

```sql
CREATE TABLE history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exer TEXT NOT NULL,
  reps INTEGER NOT NULL,
  kg REAL NOT NULL,
  created INTEGER NOT NULL
);
```

### Dependencies

- **SQL.js**: For SQLite database functionality in the browser
- **Chart.js**: For workout visualization (if charts are implemented)

### Browser Compatibility

- Modern browsers with IndexedDB support
- SQL.js requires WebAssembly support
- Tested on Chrome, Firefox, Safari, and Edge

## File Structure

```
ProgressiveOverload/
├── index.html          # Main application interface
├── db.js              # Database abstraction layer
├── style.css          # Application styling
├── charts.js          # Chart functionality (if implemented)
└── README.md          # This file
```

## Development

The application uses a database abstraction layer that allows easy switching between IndexedDB and SQLite implementations. The `DatabaseInterface` class defines the common interface, while `IndexedDBInterface` and `SQLiteInterface` provide the specific implementations.

### Key Classes

- `DatabaseInterface`: Abstract base class defining database operations
- `IndexedDBInterface`: IndexedDB implementation
- `SQLiteInterface`: SQLite implementation using SQL.js

### Adding New Database Types

To add support for additional database types:

1. Create a new class extending `DatabaseInterface`
2. Implement all required methods
3. Add the new option to the database selector in `index.html`
4. Update the `switchDatabase()` function in `db.js`

## License

This project is open source and available under the MIT License.

