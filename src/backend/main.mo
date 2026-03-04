import Map "mo:core/Map";
import Array "mo:core/Array";
import Text "mo:core/Text";
import Order "mo:core/Order";
import Nat "mo:core/Nat";

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

  let participants = Map.fromIter(
    [
      ("Denny", [] : [Text]),
      ("Rob", [] : [Text]),
      ("Jan", [] : [Text]),
      ("Karel", [] : [Text]),
      ("Matthijs", [] : [Text]),
    ].values()
  );

  public query ({ caller }) func getAllParticipants() : async [Participant] {
    participants.entries().toArray().map(func((name, dates)) { { name; dates } });
  };

  public shared ({ caller }) func updateAvailability(name : Text, dates : [Text]) : async () {
    if (participants.containsKey(name)) {
      participants.add(name, dates);
    };
  };

  public query ({ caller }) func getSortedParticipantsByAvailability() : async [Participant] {
    participants.entries().toArray().map(func((name, dates)) { { name; dates } }).sort(Participant.compareByDatesCount);
  };
};
