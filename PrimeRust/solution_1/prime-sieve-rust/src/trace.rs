use std::{
    fs::{create_dir_all, File},
    io::{self, BufWriter, Write},
    path::{Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};

const TRACE_FORMAT_VERSION: usize = 7;

pub struct TraceSummary {
    pub event_count: usize,
}

struct TraceWriter {
    writer: BufWriter<File>,
    trace_level: usize,
    event_count: usize,
}

impl TraceWriter {
    fn new(
        path: &Path,
        limit: usize,
        bit_count: usize,
        trace_level: usize,
        variant: &str,
    ) -> io::Result<Self> {
        if let Some(parent) = path.parent() {
            if !parent.as_os_str().is_empty() {
                create_dir_all(parent)?;
            }
        }

        let file = File::create(path)?;
        let mut writer = BufWriter::new(file);
        writeln!(
            writer,
            "TRACE version={} format=text sieve_size={} bit_count={} max_number={} storage_model=half trace_level={} benchmark_settings=variant={}",
            TRACE_FORMAT_VERSION,
            limit,
            bit_count,
            limit,
            trace_level,
            variant,
        )?;

        write!(writer, "TITLE title=")?;
        write_json_string(
            &mut writer,
            &format!("prime-sieve-rust - {} trace", variant),
        )?;
        write!(writer, " info=")?;
        write_json_string(
            &mut writer,
            &format!(
                "variant={} | max={} | trace_level={}",
                variant, limit, trace_level
            ),
        )?;
        writeln!(writer)?;
        writeln!(writer, "StorageModel: half")?;

        write!(writer, "TEXT level={} function=", trace_level)?;
        write_json_string(&mut writer, "Settings used")?;
        write!(writer, " annotation=")?;
        write_json_string(
            &mut writer,
            &format!(
                "variant={};max={};storage=half;trace_level={}",
                variant, limit, trace_level
            ),
        )?;
        writeln!(writer)?;

        Ok(Self {
            writer,
            trace_level,
            event_count: 0,
        })
    }

    fn finish(mut self) -> io::Result<TraceSummary> {
        self.writer.flush()?;
        Ok(TraceSummary {
            event_count: self.event_count,
        })
    }

    fn record_factor(
        &mut self,
        variant: &str,
        prime: usize,
        start: usize,
        stop: usize,
    ) -> io::Result<()> {
        if self.trace_level < 5 {
            return Ok(());
        }

        let annotation = format!(
            "SetBitsRange: variant {} prime {} setting bits with step {} in range {}-{}",
            variant, prime, prime, start, stop,
        );
        self.write_event(
            5,
            "SetBitsRange",
            prime,
            start,
            stop,
            prime,
            &[],
            &[],
            &annotation,
        )
    }

    fn record_bit_attempt(
        &mut self,
        variant: &str,
        prime: usize,
        bit_index: usize,
        changed: bool,
    ) -> io::Result<()> {
        if self.trace_level < 9 {
            return Ok(());
        }

        let number = bit_index * 2 + 1;
        let annotation = format!(
            "SetBitTrue: variant {} prime {} setting bit at index {} number {} with step {}",
            variant, prime, bit_index, number, prime,
        );
        if changed {
            self.write_event(
                9,
                "SetBitTrue",
                prime,
                bit_index,
                bit_index,
                prime,
                &[bit_index],
                &[bit_index],
                &annotation,
            )
        } else {
            self.write_event(
                9,
                "SetBitTrue",
                prime,
                bit_index,
                bit_index,
                prime,
                &[bit_index],
                &[],
                &annotation,
            )
        }
    }

    fn write_event(
        &mut self,
        level: usize,
        function: &str,
        prime: usize,
        start: usize,
        stop: usize,
        factor_step: usize,
        target_bits: &[usize],
        changed_bits: &[usize],
        annotation: &str,
    ) -> io::Result<()> {
        self.event_count += 1;
        write!(
            self.writer,
            "EVENT depth={} level={} function=",
            level, level
        )?;
        write_json_string(&mut self.writer, function)?;
        write!(
            self.writer,
            " prime={} start={} stop={} factor_step={} target_bits=",
            prime, start, stop, factor_step,
        )?;
        write_usize_array(&mut self.writer, target_bits)?;
        write!(self.writer, " annotation=")?;
        write_json_string(&mut self.writer, annotation)?;
        write!(
            self.writer,
            " changed_count={} changed_bits=",
            changed_bits.len()
        )?;
        write_usize_array(&mut self.writer, changed_bits)?;
        writeln!(self.writer)
    }
}

pub fn run_variant_trace(
    limit: usize,
    trace_level: usize,
    variant: &str,
    path: &Path,
) -> io::Result<TraceSummary> {
    let bit_count = (limit + 1) / 2;
    let mut writer = TraceWriter::new(path, limit, bit_count, trace_level, variant)?;
    let mut composite_bits = vec![0u8; bit_count];
    let q = (limit as f64).sqrt() as usize;

    let mut prime = 3usize;
    while prime <= q {
        let prime_bit = prime / 2;
        if prime_bit < composite_bits.len() && composite_bits[prime_bit] == 0 {
            let start = prime * prime / 2;
            if start < bit_count {
                writer.record_factor(variant, prime, start, bit_count - 1)?;
                let mut bit_index = start;
                while bit_index < bit_count {
                    let changed = composite_bits[bit_index] == 0;
                    if changed {
                        composite_bits[bit_index] = 1;
                    }
                    writer.record_bit_attempt(variant, prime, bit_index, changed)?;
                    bit_index += prime;
                }
            }
        }
        prime += 2;
    }

    writer.finish()
}

pub fn default_trace_path(trace_dir: &Path, variant: &str, limit: usize) -> PathBuf {
    unique_path(trace_dir.join(format!(
        "{}_rust_{}_trace_{}.sievetrace",
        timestamp_seconds(),
        variant,
        limit,
    )))
}

pub fn render_trace_file_template(template: &Path, variant: &str, limit: usize) -> PathBuf {
    let rendered = template
        .to_string_lossy()
        .replace("{timestamp}", &timestamp_seconds())
        .replace("{variant}", variant)
        .replace("{limit}", &limit.to_string());
    unique_path(PathBuf::from(rendered))
}

pub fn timestamp_seconds() -> String {
    match SystemTime::now().duration_since(UNIX_EPOCH) {
        Ok(duration) => duration.as_secs().to_string(),
        Err(_) => "0".to_string(),
    }
}

fn unique_path(path: PathBuf) -> PathBuf {
    if !path.exists() {
        return path;
    }

    let parent = path
        .parent()
        .map(Path::to_path_buf)
        .unwrap_or_else(PathBuf::new);
    let stem = path
        .file_stem()
        .and_then(|value| value.to_str())
        .unwrap_or("trace")
        .to_string();
    let extension = path
        .extension()
        .and_then(|value| value.to_str())
        .map(|value| format!(".{}", value))
        .unwrap_or_default();

    for index in 1.. {
        let candidate = parent.join(format!("{}-{}{}", stem, index, extension));
        if !candidate.exists() {
            return candidate;
        }
    }

    path
}

fn write_usize_array<W: Write>(writer: &mut W, values: &[usize]) -> io::Result<()> {
    write!(writer, "[")?;
    for (index, value) in values.iter().enumerate() {
        if index > 0 {
            write!(writer, ",")?;
        }
        write!(writer, "{}", value)?;
    }
    write!(writer, "]")
}

fn write_json_string<W: Write>(writer: &mut W, value: &str) -> io::Result<()> {
    write!(writer, "\"")?;
    for ch in value.chars() {
        match ch {
            '"' => write!(writer, "\\\"")?,
            '\\' => write!(writer, "\\\\")?,
            '\n' => write!(writer, "\\n")?,
            '\r' => write!(writer, "\\r")?,
            '\t' => write!(writer, "\\t")?,
            ch if ch < ' ' => write!(writer, "\\u{:04x}", ch as u32)?,
            ch => write!(writer, "{}", ch)?,
        }
    }
    write!(writer, "\"")
}
