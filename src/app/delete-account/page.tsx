export default function DeleteAccountPage() {
  return (
    <main style={{ maxWidth: 800, margin: "40px auto", padding: "0 16px" }}>
      <h1>Delete Your Skill Traders Account</h1>

      <p>
        If you would like to delete your Skill Traders account and associated
        data, please follow the instructions below.
      </p>

      <h2>How to request account deletion</h2>
      <ol>
        <li>
          Send an email from the email address associated with your Skill Traders
          account
        </li>
        <li>
          Email <strong>admin@skill-traders.com</strong>
        </li>
        <li>
          Use the subject line:{" "}
          <strong>Delete My Skill Traders Account</strong>
        </li>
        <li>
          Include your username or registered email address
        </li>
      </ol>

      <h2>Data that will be deleted</h2>
      <ul>
        <li>Account profile information</li>
        <li>User-generated content (posts, messages)</li>
        <li>Associated account data</li>
      </ul>

      <h2>Data retention</h2>
      <p>
        Some data may be retained for up to <strong>30 days</strong> for legal,
        security, or abuse-prevention purposes before permanent deletion.
      </p>

      <h2>Contact</h2>
      <p>
        If you have questions, contact{" "}
        <a href="mailto:admin@skill-traders.com">
          admin@skill-traders.com
        </a>
        .
      </p>
    </main>
  );
}
