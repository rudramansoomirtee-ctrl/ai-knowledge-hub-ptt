# Imperium(L) AI Knowledge Hub — Architecture, Functionality, & User Interactions

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [High-Level Architecture Diagram](#high-level-architecture)
4. [Core Functionalities](#core-functionalities)
    - [Document Upload & PDF Processing](#document-upload--pdf-processing)
    - [Semantic Vector Search](#semantic-vector-search)
    - [AI Chat (Conversational RAG)](#ai-chat-conversational-rag)
    - [Content Generator](#content-generator)
    - [Prompt Library & Templates](#prompt-library--templates)
    - [Conversation History & Bookmarks](#conversation-history--bookmarks)
    - [Interactive Learning Module](#interactive-learning-module)
    - [Settings Panel](#settings-panel)
    - [Notifications](#notifications)
5. [Component and Code Structure](#component-and-code-structure)
    - [Front-end (React)](#front-end-react)
    - [State Management & Utilities](#state-management--utilities)
6. [User Interactions & Flows](#user-interactions--flows)
    - [Uploading & Processing PDFs](#uploading--processing-pdfs)
    - [Searching Your Library](#searching-your-library)
    - [Asking Questions (“Chat”)](#asking-questions-chat)
    - [Content Generation](#content-generation-1)
    - [Managing Conversations](#managing-conversations)
    - [Using Prompts & Templates](#using-prompts--templates)
    - [Learning & Tutorials](#learning--tutorials)
    - [Settings & Export/Import](#settings--exportimport)
    - [Notifications](#notifications-1)
7. [Customization](#customization)
8. [Extending the System](#extending-the-system)
9. [Summary Table of Features](#summary-table-of-features)

---

## Overview

Imperium(L) AI Knowledge Hub is an AI-powered knowledge management web app designed for:

- **Uploading and processing documents (PDF)**
- **Performing advanced semantic searches** across documents (vector search)
- **Conversational Q&A** with Retrieval-Augmented Generation (RAG)
- **Professional content generation** (emails, summaries, reports, etc.)
- **Customizable templates and prompts library**
- **Conversation history, bookmarking, and user-driven learning modules**

---

## Tech Stack

- **React 18.2.0** (Front-end)
- **Framer Motion** (Animations)
- **Lucide React** (Icons)
- **AWS Lambda** (Backend, expected from setup)
- **Custom API** (Endpoints: `/process`, `/search`, `/rag`)
- **CSS Modules** and **global CSS** for styling
- **Local Storage** for client-side persistence

---

## High-Level Architecture

```
+-----------------------+               +-----------------+
|      User / Browser   |<----HTTP----->|  AWS Lambda API |
|  (React Frontend)     |               |  (Backend)      |
+-----------------------+               +-----------------+
        |                                          |
        v                                          v
  UI - App.js, Components                - /process: PDF upload & parsing
  - Document upload                      - /search: Vector document search
  - Semantic search                      - /rag: Retrieval-augmented QA
  - Chat, Content Generation
  - Templates, History
  - LocalStorage
```

---

## Core Functionalities

### Document Upload & PDF Processing

- Users can **upload one or more PDF documents** for processing.
- Files are processed via the `/process` API endpoint (serverless function, e.g. AWS Lambda).
- Processed documents are indexed for semantic search and RAG.

---

### Semantic Vector Search

- Users can perform **natural language search queries**.
- Search is handled by the `/search` endpoint, which performs **vector-based similarity search** across ingested documents.
- Results show **matching document fragments**, source cards/citations, and a similarity score.

---

### AI Chat (Conversational RAG)

- Users interact with an **AI assistant** in a chat interface.
- The system uses Retrieval-Augmented Generation (RAG): combines semantic retrieval with LLM response.
- Users ask questions; answers are generated using queried knowledge from uploaded documents (from `/rag` API).
- **Source citations** are attached to answers for transparency.

---

### Content Generator

- Users can select or compose **content templates** for emails, reports, meeting notes, etc.
- Generator fills in relevant information (possibly using document/database context or custom user prompts).
- Users can **save**, **preview**, and **copy** generated content.

---

### Prompt Library & Templates

- Built-in and user-created **prompt templates** for quick configuration or common tasks.
- Custom prompt editor: users can **add, edit, remove** their own prompts.
- Templates may be used for both content generation and AI chat, and can be selected or applied as-needed.

---

### Conversation History & Bookmarks

- All conversations (user-assistant exchanges) are **automatically saved** to localStorage.
- Users can:
    - **Review past conversations**
    - **Bookmark** important conversations for easy retrieval
    - **Delete** or **rate** conversations (e.g., set favorite/star, thumbs up/down)
    - **Export or import** history for backups or migrations

---

### Interactive Learning Module

- The application contains **step-by-step learning/tutorial modules**.
- Users can select a guide or tutorial, progress through steps, and revisit learning content at any time.

---

### Settings Panel

- Users can configure various aspects:
    - **Enable/disable features**
    - Export/import data
    - Clear local storage/history
    - Other toggleable UI or backend-related settings

---

### Notifications

- **In-app notifications** are used to inform about:
    - Successful file uploads
    - Errors (e.g., upload or parse errors)
    - Copy to clipboard events
    - Other system status changes

---

## Summary Table of Features

| Feature                      | Description                                                 | User Interaction                                   |
|------------------------------|-------------------------------------------------------------|----------------------------------------------------|
| PDF Upload & Processing      | Upload PDFs, parse, and index content                       | File picker, upload button, notifications          |
| Semantic Search              | Vector-based matching for queries                           | Search input, expand source cards                  |
| AI Chat (RAG)                | Ask questions, receive answers with sources                 | Chat box, send, receive, view sources              |
| Content Generation           | Fill emails, reports from templates, copy result            | Template picker, content input/output, copy        |
| Custom Templates/Prompts     | Define, save, reuse templates/prompts                       | Create/edit dialogs, save/delete buttons           |
| Conversation History         | Auto-save, rate, bookmark, export, import                   | History panel, action menus                        |
| Interactive Learning         | Stepwise guides/tutorials                                   | Module start, step navigation                      |
| Settings                     | Enable/disable features, export/import, clear history       | Settings tab, toggles and action buttons           |
| In-app Notifications         | Animated, dismissable alerts on events                      | Popups in UI, auto-dismiss                        |

---

# Notes
For any code or implementation specifics, please refer to the following:
1. **Key React Logic**: Look in `src/App.js`
2. **Styling Rules**: Defined in `src/App.css`
3. **Entry Point**: Application bootstraps from `src/index.css` or `public/index.html`.

For more, refer to `README.md` in the repository.