export type WorkspaceId = string
export type Workspace = { value: WorkspaceId; label: string }

export const workspaces: Workspace[] = [
  { value: "personal", label: "Personal workspace" },
  { value: "qa", label: "QA workspace" },
  { value: "staging", label: "Staging workspace" },
]

export type TestCase = {
  id: string
  name: string
  description: string
  steps: string[]
  expectedResult: string
}

export type TestGroup = {
  id: string
  name: string
  tests: TestCase[]
}

export const testGroups: TestGroup[] = [
  {
    id: "auth",
    name: "Auth Feature",
    tests: [
      {
        id: "valid-sign-in",
        name: "Valid sign-in",
        description: "Authenticate a registered user with valid credentials.",
        steps: [
          "Open the sign-in page.",
          "Enter a registered email and the correct password.",
          "Submit the form and navigate to a protected page.",
        ],
        expectedResult:
          "The user is signed in, redirected to the dashboard, and can access protected pages.",
      },
      {
        id: "invalid-credentials",
        name: "Invalid credentials",
        description: "Reject a sign-in attempt with an incorrect password.",
        steps: [
          "Open the sign-in page.",
          "Enter a registered email and an incorrect password.",
          "Submit the form.",
        ],
        expectedResult:
          "A generic sign-in error is shown, no authenticated session is created, and the user remains on the sign-in page.",
      },
      {
        id: "protected-route",
        name: "Protected route access",
        description:
          "Require authentication before accessing a protected page.",
        steps: [
          "Start with a signed-out browser session.",
          "Navigate directly to a protected page.",
          "Sign in with valid credentials.",
        ],
        expectedResult:
          "Protected content is hidden while signed out. The user is redirected to sign in and can access the page after authentication.",
      },
      {
        id: "admin-authorization",
        name: "Admin-only authorization",
        description: "Restrict the admin area to users with the admin role.",
        steps: [
          "Sign in as a user without the admin role.",
          "Navigate directly to the admin page and attempt a restricted action.",
          "Repeat with an admin account.",
        ],
        expectedResult:
          "The regular user cannot access admin content or perform restricted actions. The admin can access the area and complete the action.",
      },
    ],
  },
  {
    id: "posts",
    name: "Posts",
    tests: [
      {
        id: "create-post",
        name: "Create a post",
        description: "Publish a new post as an authenticated user.",
        steps: [
          "Sign in and open the new-post form.",
          "Enter a title and body, then publish the post.",
          "Open the post from the posts list.",
        ],
        expectedResult:
          "The post appears in the list and its page shows the correct title, body, and author.",
      },
      {
        id: "edit-own-post",
        name: "Edit your own post",
        description: "Allow an author to update a post they own.",
        steps: [
          "Sign in as the author of an existing post.",
          "Open the post's edit form and change its title and body.",
          "Save the changes and reload the post page.",
        ],
        expectedResult:
          "The changes persist after reload and the post remains attributed to its original author.",
      },
      {
        id: "post-authorization",
        name: "Prevent unauthorized edits",
        description:
          "Prevent a user from editing a post owned by another user.",
        steps: [
          "Create a post as the first user.",
          "Sign in as a different user and open the post.",
          "Navigate directly to the edit URL and attempt to save a change.",
        ],
        expectedResult:
          "Edit controls are unavailable, direct edit attempts are denied, and the original post is unchanged.",
      },
    ],
  },
]
