# Barangay Animal Health & Welfare System

A responsive, web-based business system designed to help a barangay organize and manage animal health and welfare services, including pet registration, rabies vaccination tracking, animal bite case reporting, pet adoption and rescue, and animal welfare mission updates.

## 1. Project Overview

The **Barangay Animal Health & Welfare System** provides a centralized platform for residents, pet owners, barangay personnel, and authorized administrators to access and manage animal-related information and services.

The system aims to improve record organization, make information easier to access, and support the delivery of animal health and welfare services within the community.

## 2. Business and Problem Statement

### Business Problem

Managing animal-related records and services manually can make information difficult to organize, update, retrieve, and monitor. Paper-based records or scattered digital files may also make it harder to maintain accurate information and coordinate community activities.

### Proposed Solution

This system provides a centralized website with Firebase integration for authentication and data storage. It supports account management, pet registration, vaccination tracking, bite case records, adoption and rescue information, and animal welfare announcements.

By organizing these functions in one system, the project aims to support more efficient record management and improve access to relevant community information.

## 3. System Features

### Public Website
- Responsive landing page introducing the system.
- Navigation to available animal health and welfare services.
- Animal-themed background and images.
- Information about the purpose and services of the system.

### User Registration and Authentication
- User registration and login using Firebase Authentication.
- Logout functionality.
- Automatic creation of a corresponding user document in Firestore when implemented and configured.
- User profile page with account information.
- Optional **About Me** field.
- Role-based access for regular users and administrators.
- Protected pages and features based on the user's role.

### User Profile and Account Management
- View and manage available profile information.
- Save optional profile details.
- Support account deletion where implemented and permitted by the configured Firebase Authentication and Firestore rules.

### Pet Registry
- Register pet and owner information.
- View and search registered pet records.
- Store relevant details such as owner name, contact number, pet name, species, breed, sex, age, birthday, and rabies vaccination status.
- Validate required fields before submitting records.
- Support record management according to the user's permissions.

### Rabies Vaccination Tracker
- Record vaccination information.
- Track vaccination dates and next-due dates where supported.
- View vaccination records for monitoring and follow-up.

### Animal Bite Case Reporting
- Record animal bite incident information.
- Maintain case details for monitoring and follow-up.
- Support status tracking where implemented.
- Restrict access to sensitive records according to the system's configured permissions.

### Pet Adoption and Rescue
- Display animals available for adoption.
- Present available animal information and photographs.
- Provide relevant adoption details and contact information where available.

### Animal Welfare Missions
- Display information about barangay animal health and welfare activities.
- Present mission details, schedules, locations, and descriptions where provided.
- Support community awareness of available services.

### News and Announcements
- Display animal-related news and community announcements.
- Present relevant information such as headlines, dates, locations, descriptions, and posting details where available.

### Data Storage and Validation
- Use Firebase Firestore to store supported application records.
- Validate required form fields.
- Provide confirmation before deletion where implemented.
- Retain saved data in the database so it can be retrieved after refreshing or reopening the website.

## 4. Technology Stack

| Technology | Purpose |
|---|---|
| HTML5 | Website structure and content |
| CSS3 | Styling and responsive layouts |
| JavaScript | Application logic and user interactions |
| Firebase Authentication | User registration and authentication |
| Firebase Cloud Firestore | Database for application records |
| Firebase JavaScript SDK v8.10.0 | Firebase integration |
| Visual Studio Code | Code editing and project development |
| Live Server | Local website testing |

## 5. Project Structure

The following is the intended organization of the project. File names and folders should match the actual submitted project.

```text
BarangayAnimalHealthSystem/
├── index.html
├── login.html
├── register.html
├── profile.html
├── profile.js
├── style.css
├── app.js
├── auth.js
├── firebase.js
├── firestore.rules
├── dashboard.js
├── news-loader.js
├── modules/
│   ├── registry.html
│   ├── vaccination.html
│   ├── bitecases.html
│   ├── adoption.html
│   ├── missions.html
│   └── news.html
└── Images/
    ├── cat.webp
    ├── kit.webp
    ├── dog.webp
    ├── pup.webp
    └── dog-cat.png
```

**Note:** Some files or image assets may be organized differently in the actual project. Refer to the submitted ZIP file for the authoritative project structure.

## 6. Setup and Run

### Prerequisites

- Visual Studio Code
- A modern web browser
- Access to the Firebase project used by the system
- The Live Server extension for Visual Studio Code

### Steps

1. Download or extract the project ZIP file.
2. Open the extracted project folder in Visual Studio Code.
3. Check that `firebase.js` contains the configuration for the intended Firebase project.
4. Confirm that Firebase Authentication and Cloud Firestore are enabled in the Firebase Console.
5. Review the Firestore security rules to ensure that access matches the application's user roles and permissions.
6. Install the Live Server extension if it is not already installed.
7. Open `index.html` and select **Open with Live Server**.
8. Open the website in your browser.
9. Test registration, login, logout, profile management, and the available modules.

For more information, visit the official [Visual Studio Code website](https://code.visualstudio.com/) and [Firebase documentation](https://firebase.google.com/docs).

## 7. Account Registration and About Me

Users can register for an account and log in through Firebase Authentication.

When configured, the system creates a corresponding user document in the Firestore `users` collection using the authenticated user's UID as the document ID:

```text
users/{uid}
```

The user document may contain information such as the user's name, email address, role, and optional profile details, depending on the fields implemented in the project.

The **About Me** field is optional. Users can leave it blank if they do not wish to provide additional information.

## 8. User Roles and Administrator Access

The system supports role-based access for regular users and administrators.

- **Regular users:** Access the features and records permitted by their assigned role.
- **Administrators:** Access administrative functions permitted by the application's role checks and Firestore security rules.

Administrator access should be assigned only to authorized accounts. Role changes must follow the project's implemented administrative process and security configuration.

**Security note:** Hiding a button or protecting a page with JavaScript alone is not sufficient to secure database records. Firestore security rules must independently enforce the appropriate permissions.

## 9. CRUD and Security Testing

The system was tested for the following operations and behaviors:

- [x] **Create:** Add new records using the available forms.
- [x] **Read:** View saved records from the database.
- [x] **Update:** Edit existing records where editing is supported.
- [x] **Delete:** Delete records where deletion is supported.
- [x] **Form validation:** Check required fields and invalid or incomplete submissions.
- [x] **Deletion confirmation:** Verify the confirmation process before deleting records.
- [x] **Data persistence:** Confirm that saved records remain available after refreshing or reopening the website.
- [x] **Registration:** Test the account registration process.
- [x] **Login:** Test authentication with valid account credentials.
- [x] **Logout:** Verify that users can log out.
- [x] **Role-based access:** Test the access permissions for regular users and administrators.
- [x] **Protected pages:** Test access restrictions for protected areas.
- [x] **Profile management:** Test available profile features, including the optional About Me field.
- [x] **Firebase integration:** Verify that the relevant application features work with the configured Firebase services.

These checks indicate the tests performed during development. The actual level of protection depends on the deployed Firebase configuration and security rules.

## 10. Test Accounts for Demonstration

Use dedicated test accounts when demonstrating the system to the instructor.

| Account | Email | Access |
|---|---|---|
| Administrator | Provide the designated test email privately | Administrator features |
| Regular User | Provide the designated test email privately | Regular user features |

Provide the instructor with the necessary test credentials through an appropriate private channel if requested.

**Do not publish account passwords, private credentials, or sensitive configuration files in a public GitHub repository.** Use test accounts rather than personal accounts for demonstrations.

## 11. Privacy and Security Considerations

The system uses Firebase Authentication and Cloud Firestore to support account authentication and application data storage.

Security depends on correctly configured Firebase services and database rules. In particular:

- Users should only be able to access records permitted by their role.
- Administrative permissions should not be granted to unauthorized users.
- Sensitive animal bite case information should be restricted according to the intended access policy.
- Client-side validation should be supported by appropriate database security rules.
- Firebase configuration and database rules should be reviewed before deployment.
- No Firebase service-account private keys or other server-side secrets should be included in the public repository.

## 12. Known Limitations

The system's functionality depends on the modules and Firebase services configured in the submitted project.

- Access to Firebase-backed features requires a valid internet connection.
- The availability of database operations depends on Firebase configuration, security rules, and service availability.
- Vaccination reminders, messaging, notifications, and other advanced functions are available only if they have been implemented and configured.
- Records and user permissions depend on the application's current database structure and access rules.
- The accuracy of stored information depends on the data entered by users and authorized personnel.

## 13. AI Disclosure

ChatGPT was used as an AI-assisted development tool for planning, troubleshooting, reviewing, and drafting parts of the project documentation and code.

The project was reviewed and tested during development. The submitted implementation and its functionality should be evaluated based on the actual source code, Firebase configuration, and demonstrated test results.

## 14. Submission Checklist

- [x] Website source code organized in the project folder.
- [x] Firebase integration configured for the project.
- [x] User registration, login, and logout tested.
- [x] User and administrator access tested.
- [x] Available CRUD operations tested.
- [x] Form validation and deletion confirmation tested.
- [x] Data persistence tested.
- [x] Website images and page layouts checked.
- [x] README documentation prepared.
- [x] Project ZIP prepared for submission.
- [x] GitHub repository prepared, if required by the instructor.
- [x] Screenshots or a demonstration prepared, if required by the instructor.

---

**Project:** Barangay Animal Health & Welfare System

**Purpose:** To provide a centralized website for managing and accessing barangay animal health and welfare services.

**Developed using:** HTML, CSS, JavaScript, and Firebase.
