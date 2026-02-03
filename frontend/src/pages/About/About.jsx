import styles from "./About.module.css";

export default function About() {
  return (
    <section className={styles.page}>
      <h1 className={styles.title}>About</h1>

      <p className={styles.paragraph}>
        This app allows users to visualize acceleration–speed profiles derived from GPS sports data.
      </p>

      <p className={styles.paragraph}>
        Uploaded files should have proper structure. They must be <strong>.csv</strong> files and
        include <strong>acc</strong> and <strong>speed</strong> columns.
      </p>

      <p className={styles.disclaimer}>
        <strong>This application is developed as part of an engineering thesis.</strong>
      </p>

      <h2 className={styles.subtitle}>References</h2>

      <ol className={styles.references}>
        <li>
          <a
            href="https://www.researchgate.net/publication/351607405_Individual_acceleration-speed_profile_in-situ_A_proof_of_concept_in_professional_football_players"
            target="_blank"
            rel="noreferrer"
          >
            Morin et al. (2021) Individual acceleration–speed profile in-situ: A proof of concept in
            professional football players.
          </a>
        </li>
      </ol>
    </section>
  );
}
