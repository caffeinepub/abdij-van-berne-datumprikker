import Map "mo:core/Map";
import Array "mo:core/Array";
import Text "mo:core/Text";
import Order "mo:core/Order";
import Nat "mo:core/Nat";
import Migration "migration";

(with migration = Migration.run)
actor {
  type Participant = {
    name : Text;
    dates : [Text];
  };

  module Participant {
    public func compareByDatesCount(p1 : Participant, p2 : Participant) : Order.Order {
      switch (Nat.compare(p1.dates.size(), p2.dates.size())) {
        case (#equal) { Text.compare(p1.name, p2.name) };
        case (order) { order };
      };
    };
  };

  var participants = Map.empty<Text, [Text]>();

  public query ({ caller }) func getAllParticipants() : async [Participant] {
    participants.entries().toArray().map(func((name, dates)) { { name; dates } });
  };

  public shared ({ caller }) func updateAvailability(name : Text, dates : [Text]) : async () {
    participants.add(name, dates);
  };

  public query ({ caller }) func getSortedParticipantsByAvailability() : async [Participant] {
    participants.entries().toArray().map(func((name, dates)) { { name; dates } }).sort(Participant.compareByDatesCount);
  };
};
