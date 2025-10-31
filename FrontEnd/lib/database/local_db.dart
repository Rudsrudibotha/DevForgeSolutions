import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:sqlite3_flutter_libs/sqlite3_flutter_libs.dart';

part 'local_db.g.dart';

class Students extends Table {
  TextColumn get id => text()();
  TextColumn get schoolId => text()();
  TextColumn get studentNo => text()();
  TextColumn get firstName => text()();
  TextColumn get lastName => text()();
  TextColumn get grade => text().nullable()();
  DateTimeColumn get updatedAt => dateTime()();
  
  @override
  Set<Column> get primaryKey => {id};
}

class Attendance extends Table {
  TextColumn get id => text()();
  TextColumn get schoolId => text()();
  TextColumn get studentId => text()();
  DateTimeColumn get date => dateTime()();
  DateTimeColumn get checkIn => dateTime().nullable()();
  DateTimeColumn get checkOut => dateTime().nullable()();
  BoolColumn get synced => boolean().withDefault(const Constant(false))();
  
  @override
  Set<Column> get primaryKey => {id};
}

@DriftDatabase(tables: [Students, Attendance])
class LocalDb extends _$LocalDb {
  LocalDb() : super(_openConnection());

  @override
  int get schemaVersion => 1;

  static QueryExecutor _openConnection() {
    return NativeDatabase.memory();
  }
}