const BACKEND_URL = "http://localhost:3000";

async function testDelete() {
    try {
        // 1. Signup
        const username = "testuser_" + Math.floor(Math.random() * 10000);
        const password = "TestPassword123!";
        console.log(`Signing up user: ${username}`);

        await fetch(`${BACKEND_URL}/api/v1/signup`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });

        // 2. Signin
        const loginRes = await fetch(`${BACKEND_URL}/api/v1/signin`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });
        const loginData = await loginRes.json();
        const token = loginData.token;
        console.log("Logged in, token:", token.substring(0, 20) + "...");

        // 3. Create Content
        console.log("Creating content...");
        const createRes = await fetch(`${BACKEND_URL}/api/v1/content`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                title: "Test Content",
                link: "https://google.com",
                type: "Document"
            })
        });
        const createData = await createRes.json();
        console.log("Create response:", createData);

        // 4. Get Content to get ID
        const contentRes = await fetch(`${BACKEND_URL}/api/v1/content`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const contentData = await contentRes.json();

        const content = contentData.content[0];
        if (!content) {
            console.error("Failed to create content!");
            console.error("Content response:", contentData);
            return;
        }
        console.log("Content created, ID:", content._id);

        // 5. Delete Content
        console.log("Deleting content...");
        const deleteRes = await fetch(`${BACKEND_URL}/api/v1/content`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ contentId: content._id })
        });

        const deleteData = await deleteRes.json();
        console.log("Delete response:", deleteData);

        // 6. Verify Deletion
        const verifyRes = await fetch(`${BACKEND_URL}/api/v1/content`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const verifyData = await verifyRes.json();

        if (verifyData.content.length === 0) {
            console.log("SUCCESS: Content deleted successfully!");
        } else {
            console.error("FAILURE: Content still exists!");
        }

    } catch (error) {
        console.error("Test failed:", error);
    }
}

testDelete();
