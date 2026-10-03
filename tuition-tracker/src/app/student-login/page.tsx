import Image from 'next/image';

export default function StudentLogin() {
  return (
    <div id="student-login-screen" className="login-screen">

      <div className="login-hero" aria-hidden="true">
        <Image
          src="/login-bg.jpg"
          alt=""
          fill
          priority
          className="login-hero-img"
          sizes="(min-width: 1024px) 50vw, 0px"
        />
        <div className="login-hero-overlay" />
      </div>
    <div className="login-form-col">         
      <div className="login-box">
          <div className="login-logo" style={{display: 'flex',justifyContent: 'center',alignItems: 'center',    marginBottom: '12px',}}>
             <img src="/icons/student.png" alt="logo" style={{ height: '60px',width: '60px',objectFit: 'contain',display: 'block',}}/>
          </div>

        <div className="login-title">Tuition Tracker</div>

        <div className="login-sub">
          Sign in to see your performance.
        </div>

        <div className="login-err">
          <i className="ti ti-alert-square-rounded"></i>
          Invalid email or NIC.
        </div>

        <form>
          <div className="formGroup">
            <label htmlFor="student-email">Email</label>
            <input
              id="student-email"
              name="email"
              placeholder="student@email.com"
              type="email"
              required
            />
          </div>

          <div className="formGroup">
            <label htmlFor="student-nic">NIC</label>
            <input
              id="student-nic"
              name="nic"
              placeholder="200012345678 / 951234567V"
              required
            />
          </div>

          <button
            type="submit"
            className="signinbtn"
            style={{
              width: '100%',
              justifyContent: 'center',
              padding: '11px',
            }}
          >
            Sign in
          </button>
        </form>

        <div className="login-switch">
          Tutor / Admin? <a href="/login">Admin login</a>
        </div>
      </div>
    </div>
   </div>
  );
}

