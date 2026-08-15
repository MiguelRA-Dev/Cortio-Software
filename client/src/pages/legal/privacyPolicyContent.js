// Static snapshot of the Usercentrics-generated privacy policy (originally loaded at
// runtime from https://policygenerator.usercentrics.eu/api/embedding). Cloned here as a
// fixed string, with every personal contact mention (phone number, and the
// admin@cortiosoftware.com inbox nobody actually monitors) replaced by a generic
// reference to the platform's own support channels. Content otherwise unchanged from
// what Usercentrics generated, including its own inline <style> block.
const PRIVACY_POLICY_HTML = `
<style>
  /* Headings */
  .privacy-wrapper {
    display: flex;
    justify-content: flex-start;
    align-items: flex-start;
    color: #18181b;
  }

  .privacy-wrapper *,
  .privacy-wrapper *::before,
  .privacy-wrapper *::after {
    box-sizing: border-box;
  }

  .privacy-content {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 32px;
  }

  .privacy-section {
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 100%;
  }

  .privacy-section.gap-small {
    gap: 8px;
  }

  .privacy-section.gap-large {
    gap: 24px;
  }

  .privacy-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  }

  .privacy-meta-group {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    line-height: 1;
    color: #52525b;
  }

  .privacy-meta-group span,
  .privacy-meta-group strong,
  .privacy-meta-group a {
    font-size: inherit;
    color: inherit;
  }

  .privacy-meta-group a {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .privacy-meta-group strong {
    font-weight: 600;
  }

  .privacy-chip {
    display: inline-block;
    width: 12px;
    height: 12px;
    border-radius: 4px;
    background-color: #d4d4d8;
  }

  .privacy-chip.small {
    width: 10px;
    height: 10px;
    background-color: #a1a1aa;
  }

  .privacy-title {
    margin: 0;
    font-size: 30px;
    font-weight: 600;
    line-height: 1.5;
    color: #0f172a;
  }

  .privacy-section-title {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
    line-height: 1.5;
    color: #0f172a;
  }

  .privacy-subtitle {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    line-height: 1.4;
    color: #0f172a;
  }

  .privacy-meta-text {
    margin: 0;
    font-size: 12px;
    font-weight: 500;
    line-height: 1.2;
    color: #52525b;
  }

  .privacy-text {
    margin: 0;
    font-size: 14px;
    line-height: 1.5;
    color: #27272a;
    font-weight: 400;
  }

  .privacy-text strong {
    font-weight: 600;
  }

  .privacy-list {
    margin: 0;
    padding-left: 20px;
    list-style: square;
  }

  .privacy-list .privacy-list-item+.privacy-list-item {
    margin-top: 6px;
  }

  .privacy-list-item .privacy-text {
    display: inline;
  }

  .privacy-measure-title {
    font-weight: 600;
  }

  .privacy-table-container {
    width: 100%;
    border: 1px solid #a1a1aa;
    border-radius: 16px;
    overflow: hidden;
    background-color: #fff;
  }

  .privacy-table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    table-layout: fixed;
  }

  .privacy-table thead {
    background-color: #f4f4f5;
  }

  .privacy-table th,
  .privacy-table td {
    padding: 16px 20px;
    font-size: 14px;
    line-height: 1.4;
    color: #27272a;
    vertical-align: top;
    border-left: 1px solid #a1a1aa;
    word-break: break-word;
  }

  .privacy-table th:first-child,
  .privacy-table td:first-child {
    border-left: none;
  }

  .privacy-table thead th {
    font-weight: 600;
    color: #52525b;
    text-align: left;
    border-bottom: 1px solid #a1a1aa;
    letter-spacing: 0.2px;
  }

  .privacy-table tbody tr+tr td {
    border-top: 1px solid #a1a1aa;
  }

  .privacy-table td ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .privacy-table td ul li+li {
    margin-top: 6px;
  }

  .privacy-table a {
    color: #27272a;
    text-decoration: none;
  }

  .privacy-table a:hover,
  .privacy-table a:focus {
    text-decoration: underline;
  }

  .privacy-table th:nth-child(1),
  .privacy-table td:nth-child(1),
  .privacy-table th:nth-child(2),
  .privacy-table td:nth-child(2) {
    width: 208px;
  }

  .privacy-table th:nth-child(3),
  .privacy-table td:nth-child(3),
  .privacy-table th:nth-child(4),
  .privacy-table td:nth-child(4) {
    width: 288px;
  }

  .privacy-footer {
    padding: 32px 0;
    border-top: 1px solid #e5e7eb;
    border-bottom: 1px solid #e5e7eb;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    font-size: 14px;
    color: #52525b;
  }

  .privacy-footer .privacy-meta-group {
    font-size: 14px;
    color: #52525b;
  }

  @media (max-width: 1024px) {
    .privacy-wrapper {
      padding: 64px 32px;
    }

    .privacy-row {
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
    }

    .privacy-table {
      table-layout: auto;
    }

    .privacy-table th:nth-child(1),
    .privacy-table td:nth-child(1),
    .privacy-table th:nth-child(2),
    .privacy-table td:nth-child(2),
    .privacy-table th:nth-child(3),
    .privacy-table td:nth-child(3),
    .privacy-table th:nth-child(4),
    .privacy-table td:nth-child(4) {
      width: auto;
    }
  }
</style>
<div class="uc-privacy-container privacy-wrapper">
  <div class="privacy-content">
    <section class="privacy-section gap-small">
      <div class="privacy-row">
        <h1 class="privacy-title">Privacy Policy</h1>
        <p class="privacy-meta-text">Effective Date: 06/08/2026, 21:23:32</p>
      </div>
          </section>
    <section class="privacy-section">
      <h2 class="privacy-section-title">Introduction and organizational info</h2>
      <p class="privacy-text">We, at Cortio Software, are dedicated to serving our customers and contacts to the best of our abilities. Part of our commitment involves the responsible management of personal information collected through our website cortiosoftware.com, and any related interactions. Our primary goals in processing this information include:</p>
      <ul class="privacy-list">
        <li class="privacy-list-item">
          <p class="privacy-text">Enhancing the user experience on our platform by understanding customer needs and preferences.</p>
        </li>
        <li class="privacy-list-item">
          <p class="privacy-text">Providing timely support and responding to inquiries or service requests.</p>
        </li>
        <li class="privacy-list-item">
          <p class="privacy-text">Improving our products and services to meet the evolving demands of our users.</p>
        </li>
        <li class="privacy-list-item">
          <p class="privacy-text">Conducting necessary business operations, such as billing and account management.</p>
        </li>
      </ul>
      <p class="privacy-text">It is our policy to process personal information with the utmost respect for privacy and security. We adhere to all relevant regulations and guidelines to ensure that the data we handle is protected against unauthorized access, disclosure, alteration, and destruction. Our practices are designed to safeguard the confidentiality and integrity of your personal information, while enabling us to deliver the services you trust us with.</p>
      <ul class="privacy-list">
        <li class="privacy-list-item">
                    <p class="privacy-text">We do not have a designated Data Protection Officer (DPO) but remain fully committed to addressing your privacy concerns. Should you have any questions or require further information about how we manage personal information, please feel free to contact us through the support channels available within the platform.</p>
                  </li>
      </ul>
      <p class="privacy-text">Your privacy is our priority. We are committed to processing your personal information transparently and with your safety in mind. This commitment extends to our collaboration with third-party services that may process personal information on our behalf, such as in the case of sending invoices. Rest assured, all activities are conducted in strict compliance with applicable privacy laws.</p>
    </section>

    <section class="privacy-section">
      <h3 class="privacy-section-title">Scope and application</h3>
      <p class="privacy-text">Our privacy policy is designed to protect the personal information of all our stakeholders, including website visitors, registered users, and customers. Whether you are just browsing our website cortiosoftware.com, using our services as a registered user, or engaging with us as a valued customer, we ensure that your personal data is processed with the highest standards of privacy and security. This policy outlines our practices and your rights related to personal information.</p>
    </section>

    <section class="privacy-section gap-large">
      <div class="privacy-section">
        <h3 class="privacy-section-title">Data storage and protection</h3>
        <h4 class="privacy-subtitle">Data storage</h4>
        <ul class="privacy-list">
          <li class="privacy-list-item">Personal information is stored in secure servers located in the following locations: CO. For services that require international data transfer, we ensure that such transfers comply with all applicable laws and maintain data protection standards equivalent to those in our primary location.</li>
          <li class="privacy-list-item">Data hosting partners: We partner with reputable data hosting providers committed to using state-of-the-art security measures. These partners are selected based on their adherence to stringent data protection standards.</li>
        </ul>
      </div>
          </section>

        <section class="privacy-section">
      <h3 class="privacy-section-title">Data processing agreements</h3>
      <p class="privacy-text">When we share your data with third-party service providers, we do so under the protection of Data Processing Agreements (DPAs) that ensure your information is managed in accordance with GDPR and other relevant data protection laws. These agreements mandate that third parties implement adequate technical and organizational measures to ensure the security of your data.</p>
      <h4 class="privacy-subtitle">Transparency and control</h4>
      <p class="privacy-text">We believe in transparency and providing you with control over your personal information. You will always be informed about any significant changes to our sharing practices, and where applicable, you will have the option to consent to such changes.</p>
      <p class="privacy-text">Your trust is important to us, and we strive to ensure that your personal information is disclosed only in accordance with this policy and when there is a justified reason to do so. For any queries or concerns about how we share and disclose personal information, please reach out to us through the support channels available within the platform.</p>
    </section>

    <section class="privacy-section">
      <h3 class="privacy-section-title">User rights and choices</h3>
      <p class="privacy-text">At Cortio Software, we recognize and respect your rights regarding your personal information, in accordance with the General Data Protection Regulation (GDPR) and other applicable data protection laws. We are committed to ensuring you can exercise your rights effectively. Below is an overview of your rights and how you can exercise them:</p>
      <p class="privacy-text">Your rights</p>
      <ul class="privacy-list">
                <li class="privacy-list-item">
          <p class="privacy-text"><strong>Right of access</strong> (<a href="https://gdpr.eu/article-15-right-of-access/" target="_blank">Art. 15 GDPR</a>): You have the right to request access to the personal information we hold about you and to obtain information about how we process it.</p>
        </li>
                <li class="privacy-list-item">
          <p class="privacy-text"><strong>Right to rectification</strong> (<a href="https://gdpr.eu/article-16-right-to-rectification/" target="_blank">Art. 16 GDPR</a>): If you believe that any personal information we hold about you is incorrect or incomplete, you have the right to request its correction or completion.</p>
        </li>
                <li class="privacy-list-item">
          <p class="privacy-text"><strong>Right to erasure ('right to be forgotten')</strong> (<a href="https://gdpr.eu/article-17-right-to-be-forgotten/" target="_blank">Art. 17 GDPR</a>): You have the right to request the deletion of your personal information when it is no longer necessary for the purposes for which it was collected, among other circumstances.</p>
        </li>
                <li class="privacy-list-item">
          <p class="privacy-text"><strong>Right to restriction of processing</strong> (<a href="https://gdpr.eu/article-18-right-to-restriction-of-processing/" target="_blank">Art. 18 GDPR</a>): You have the right to request that we restrict the processing of your personal information under certain conditions.</p>
        </li>
                <li class="privacy-list-item">
          <p class="privacy-text"><strong>Right to data portability</strong> (<a href="https://gdpr.eu/article-20-right-to-data-portability/" target="_blank">Art. 20 GDPR</a>): You have the right to receive your personal information in a structured, commonly used, and machine-readable format and to transmit those data to another controller.</p>
        </li>
                <li class="privacy-list-item">
          <p class="privacy-text"><strong>Right to object</strong> (<a href="https://gdpr.eu/article-21-right-to-object/" target="_blank">Art. 21 GDPR</a>): You have the right to object to the processing of your personal information, under certain conditions, including processing for direct marketing.</p>
        </li>
                <li class="privacy-list-item">
          <p class="privacy-text"><strong>Right to withdraw consent</strong> (<a href="https://gdpr.eu/article-7-how-to-get-consent-to-collect-personal-data/" target="_blank">Art. 7(3) GDPR</a>): Where the processing of your personal information is based on your consent, you have the right to withdraw that consent at any time without affecting the lawfulness of processing based on consent before its withdrawal.</p>
        </li>
                <li class="privacy-list-item">
          <p class="privacy-text"><strong>Right to lodge a complaint</strong> (<a href="https://gdpr.eu/article-77-right-to-lodge-a-complaint-with-a-supervisory-authority/" target="_blank">Art. 77 GDPR</a>): You have the right to lodge a complaint with a supervisory authority if you believe our processing of your personal information violates applicable data protection laws.</p>
        </li>
              </ul>
      <h4 class="privacy-subtitle">Exercising your rights</h4>
            <p class="privacy-text">To exercise any of these rights, please contact us through the support channels available within the platform. We will respond to your request in accordance with applicable data protection laws and within the timeframes stipulated by those laws. Please note, in some cases, we may need to verify your identity as part of the process to ensure the security of your personal information.</p>
            <p class="privacy-text">We are committed to facilitating the exercise of your rights and to ensuring you have full control over your personal information. If you have any questions or concerns about how your personal information is handled, please do not hesitate to get in touch with us.</p>
    </section>

    <section class="privacy-section gap-large">
      <div class="privacy-section">
        <h3 class="privacy-section-title">Cookies and tracking technologies</h3>
        <p class="privacy-text">At Cortio Software, we value your privacy and are committed to being transparent about our use of cookies and other tracking technologies on our website cortiosoftware.com. These technologies play a crucial role in ensuring the smooth operation of our digital platforms, enhancing your user experience, and providing insights that help us improve.</p>
        <h4 class="privacy-subtitle">Understanding cookies and tracking technologies</h4>
        <p class="privacy-text">Cookies are small data files placed on your device that enable us to remember your preferences and collect information about your website usage. Tracking technologies, such as web beacons and pixel tags, help us understand how you interact with our site and which pages you visit.</p>
        <h4 class="privacy-subtitle">How we use these technologies</h4>
        <ul class="privacy-list">
                    <li class="privacy-list-item">
            <p class="privacy-text">Essential cookies: Necessary for the website's functionality, such as authentication and security. They do not require consent.</p>
          </li>
                    <li class="privacy-list-item">
            <p class="privacy-text">Performance and analytics cookies: These collect information about how visitors use our website, which pages are visited most frequently, and if error messages are received from web pages. These cookies help us improve our website.</p>
          </li>
                    <li class="privacy-list-item">
            <p class="privacy-text">Functional cookies: Enable the website to provide enhanced functionality and personalization, like remembering your preferences.</p>
          </li>
                    <li class="privacy-list-item">
            <p class="privacy-text">Advertising and targeting cookies: Used to deliver advertisements more relevant to you and your interests. They are also used to limit the number of times you see an advertisement and help measure the effectiveness of the advertising campaign.</p>
          </li>
                  </ul>
        <h4 class="privacy-subtitle">Your choices and consent</h4>
        <p class="privacy-text">Upon your first visit, our website will present you with a cookie consent banner, where you can:</p>
        <ul class="privacy-list">
                    <li class="privacy-list-item">
            <p class="privacy-text">Accept all cookies: Consent to the use of all cookies and tracking technologies.</p>
          </li>
                    <li class="privacy-list-item">
            <p class="privacy-text">Reject non-essential cookies: Only essential cookies will be used to provide you with necessary website functions.</p>
          </li>
                    <li class="privacy-list-item">
            <p class="privacy-text">Customize your preferences: Choose which categories of cookies you wish to allow.</p>
          </li>
                  </ul>
      </div>
                      </section>
        <section class="privacy-section">
      <h3 class="privacy-section-title">Compliance with United States privacy laws</h3>
      <p class="privacy-text">To appeal a decision we may make regarding your request, please contact us within 60 days of receiving our response through the support channels available within the platform. In your appeal request, please include your original request, the date of our response, and a brief explanation of why you believe our decision was incorrect.</p>
      <p class="privacy-text">For residents of the United States of America the following provisions apply:</p>
      <h4 class="privacy-subtitle">A. Individual rights</h4>
            <p class="privacy-text">The California Consumer Privacy Act provides residents of California specific rights regarding their personal information, additional to what has been described before.</p>
            <h4 class="privacy-subtitle">B. Right to Know</h4>
      <p class="privacy-text">You may request that we disclose to you what personal information we have collected, used, shared, or sold about you, and why we collected, used, shared, or sold that information. Specifically, you may request the disclosure of:</p>
      <ul class="privacy-list">
                <li class="privacy-list-item">
          <p class="privacy-text">The categories of personal information collected</p>
        </li>
                <li class="privacy-list-item">
          <p class="privacy-text">Specific pieces of personal information collected</p>
        </li>
                <li class="privacy-list-item">
          <p class="privacy-text">The categories of sources from which we collected personal information</p>
        </li>
                <li class="privacy-list-item">
          <p class="privacy-text">The purposes for which personal information is used</p>
        </li>
                <li class="privacy-list-item">
          <p class="privacy-text">The categories of third parties with whom personal information is shared</p>
        </li>
                <li class="privacy-list-item">
          <p class="privacy-text">The categories of information that are sold or disclosed to third parties</p>
        </li>
              </ul>
      <h4 class="privacy-subtitle">C. Right to Delete</h4>
      <p class="privacy-text">You may request that we delete personal information we have collected about you.</p>
      <h4 class="privacy-subtitle">D. Right to Correct</h4>
      <p class="privacy-text">You may ask us to correct inaccurate information that we have about you.</p>
      <h4 class="privacy-subtitle">E. Right to Limit</h4>
      <p class="privacy-text">You can request us to only use your sensitive personal information (for example, your social security number, your genetic data, etc.) for limited purposes, such as providing you with the services you requested.</p>
      <h4 class="privacy-subtitle">F. Right to Opt-Out</h4>
                  <p class="privacy-text">Cortio Software does not sell or share personal information. In case your data is sold or shared you can make use of your right to opt-out of the sale or sharing of personal information by submitting your request through the link on our website.</p>
                  <h4 class="privacy-subtitle">G. Right to Non-Discrimination</h4>
      <p class="privacy-text">You have the right to be protected from discrimination for exercising your rights.</p>
      <h4 class="privacy-subtitle">H. Submitting requests</h4>
      <p class="privacy-text">You may submit your request through the support channels available within the platform. We will compare the information you submit to us with the information we have in our records to verify your request. We will then respond to your request in accordance with the requirements.</p>
                  <h4 class="privacy-subtitle">J. Sensitive data and/or biometric data</h4>
      <p class="privacy-text">We only process sensitive personal data with your prior consent and only for specific purposes that are clearly disclosed at the time of collection. You may withdraw your consent at any time by submitting your request through the link on our website or through the support channels available within the platform.</p>
          </section>
                        <div class="privacy-footer">
      <div class="privacy-meta-group">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
          <mask id="mask0_7201_3680" style="mask-type:alpha" maskUnits="userSpaceOnUse" x="0" y="0" width="12" height="12">
            <rect width="12" height="12" fill="#D9D9D9" />
          </mask>
          <g mask="url(#mask0_7201_3680)">
            <path d="M4 11L4.5 7.5H2L6.5 1H7.5L7 5H10L5 11H4Z" fill="#979797" />
          </g>
        </svg>
        <span>Powered by <strong>Usercentrics</strong></span>
      </div>
      <div class="privacy-meta-group">
        <span class="privacy-meta-link">
          <a href="https://usercentrics.com/privacy-policy-generator/" target="_blank">
            <span>Generate Yours</span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <mask id="mask0_7172_8069" style="mask-type:alpha" maskUnits="userSpaceOnUse" x="0" y="0" width="16" height="16">
                <rect width="16" height="16" fill="#D9D9D9" />
              </mask>
              <g mask="url(#mask0_7172_8069)">
                <path d="M10.7833 8.66699H2.66663V7.33366H10.7833L7.04996 3.60033L7.99996 2.66699L13.3333 8.00033L7.99996 13.3337L7.04996 12.4003L10.7833 8.66699Z" fill="#595959" />
              </g>
            </svg>
          </a>
        </span>
      </div>
    </div>
      </div>
</div>
`

export default PRIVACY_POLICY_HTML
