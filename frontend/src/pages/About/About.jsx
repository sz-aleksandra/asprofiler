import styles from "./About.module.css";
export default function About() {
  return (
    <div className={styles.aboutPage}>
      <h1 className={styles.title}>About</h1>

      <p className={styles.paragraph}>
        This app supports configurable analysis of football players' GNSS/GPS session data from
        STATSports CSV exports.
      </p>

      <p className={styles.paragraph}>
        Uploaded files must be <strong>.csv</strong> files and include <strong>Time</strong>,{" "}
        <strong>Speed (m/s)</strong>, <strong>Lat</strong>, <strong>Lon</strong>,{" "}
        <strong>Hacc</strong>, <strong>Hdop</strong>, and{" "}
        <strong>No. of Satellites</strong> columns.
      </p>

      <p className={styles.paragraph}>
        The application filters samples by GNSS signal quality, normalizes the input data, and
        supports analysis of acceleration-speed profiles, deceleration-speed profiles, high-speed
        running, acceleration and deceleration events, pitch zones, time series, trajectories, and
        exportable results.
      </p>

      <p className={styles.disclaimer}>
        <strong>
          This application was developed as part of an engineering thesis in Computer Science at the
          Faculty of Electronics and Information Technology, Warsaw University of Technology.
        </strong>
      </p>

      <h2 className={styles.subtitle}>References</h2>

      <ol className={styles.references}>
        <li>
          <a
            href="https://www.researchgate.net/publication/351607405_Individual_acceleration-speed_profile_in-situ_A_proof_of_concept_in_professional_football_players"
            rel="noopener noreferrer"
            target="_blank"
          >
            Morin et al. (2021) Individual acceleration-speed analysis profile in-situ: A proof of
            concept in professional football players.
          </a>
        </li>
      </ol>
    </div>
  );
}
